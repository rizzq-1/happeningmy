import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Allow up to 60s for large poster processing
export const maxDuration = 60;

const EXTRACTION_PROMPT = `You are an expert event data extractor for Malaysian events. Analyze this event poster/flyer image and extract structured information.

Return ONLY a valid JSON object with these fields:
{
  "title": "Event title",
  "description": "Brief description of the event (2-3 sentences)",
  "date": "YYYY-MM-DD format",
  "time": "HH:MM format (24h)",
  "endDate": "YYYY-MM-DD format or null",
  "endTime": "HH:MM format or null",
  "venue": "Venue name",
  "address": "Full street address",
  "city": "City name in Malaysia",
  "state": "Malaysian state",
  "category": "One of: music, arts, food, sports, tech, community, education, business, wellness, culture, charity, nightlife, family, outdoor",
  "tags": ["array", "of", "relevant", "tags"],
  "price": "Price string (e.g., 'RM 50', 'Free')",
  "isFree": true/false,
  "organizer": "Organizer name",
  "contactEmail": "email or null",
  "contactPhone": "phone or null",
  "website": "url or null",
  "sdgGoals": [array of relevant SDG goal numbers from 4, 8, 11],
  "confidence": 0.0 to 1.0 (how confident you are in the extraction)
}

Important:
- If a field is not visible in the image, make a reasonable inference based on context.
- For Malaysian events, default city to "Kuala Lumpur" if unclear.
- Identify SDG goals: 4=Education, 8=Economic Growth, 11=Sustainable Communities.
- confidence should reflect how much information was clearly readable.`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key") {
      // Return mock extraction for demo
      return NextResponse.json({
        extraction: {
          title: "Demo Event - Configure Gemini API Key",
          description: "This is a demo extraction. Set GOOGLE_AI_API_KEY in .env.local to enable real AI extraction via Gemini 1.5 Flash.",
          date: "2026-03-15",
          time: "18:00",
          endTime: "22:00",
          venue: "KLCC Convention Centre",
          address: "Kuala Lumpur City Centre",
          city: "Kuala Lumpur",
          state: "W.P. Kuala Lumpur",
          category: "community",
          tags: ["demo", "ai", "gemini"],
          price: "Free",
          isFree: true,
          organizer: "HappeningMY",
          sdgGoals: [11],
          confidence: 0.85,
        },
      });
    }

    // Parse the multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error("FormData parse error:", formError);
      return NextResponse.json(
        { error: "Failed to parse upload. Please try a smaller image or different format." },
        { status: 400 }
      );
    }

    const posterFile = formData.get("poster") as File | null;

    if (!posterFile || posterFile.size === 0) {
      return NextResponse.json(
        { error: "No poster file provided. Please select an image to upload." },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
    if (!allowedTypes.includes(posterFile.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${posterFile.type}. Please upload a JPG, PNG, or WebP image.` },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (posterFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await posterFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = posterFile.type || "image/jpeg";

    console.log(`[extract] Processing poster: ${posterFile.name}, ${posterFile.type}, ${(posterFile.size / 1024).toFixed(1)}KB`);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Send image to Gemini for multimodal parsing
    const result = await model.generateContent([
      EXTRACTION_PROMPT,
      {
        inlineData: {
          data: base64,
          mimeType,
        },
      },
    ]);

    const response = result.response;
    const text = response.text();

    // Parse JSON from response (handle markdown code blocks too)
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[extract] No JSON found in Gemini response:", text.substring(0, 500));
      return NextResponse.json(
        { error: "AI could not parse this image. Try a clearer poster with visible text." },
        { status: 422 }
      );
    }

    const extraction = JSON.parse(jsonMatch[0]);

    console.log(`[extract] Success: "${extraction.title}" (confidence: ${extraction.confidence})`);

    return NextResponse.json({ extraction });
  } catch (error) {
    console.error("Extraction error:", error);

    // Provide user-friendly error messages
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("API_KEY_INVALID") || message.includes("API key")) {
      return NextResponse.json(
        { error: "Invalid Gemini API key. Please check your GOOGLE_AI_API_KEY in .env.local." },
        { status: 401 }
      );
    }
    if (message.includes("SAFETY")) {
      return NextResponse.json(
        { error: "The image was blocked by safety filters. Please try a different poster." },
        { status: 400 }
      );
    }
    if (message.includes("quota") || message.includes("429")) {
      return NextResponse.json(
        { error: "API rate limit reached. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to extract event details. Please try again." },
      { status: 500 }
    );
  }
}
