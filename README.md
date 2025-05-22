# CallQA

A web application for analyzing call center recordings. It uses AI to transcribe audio and assess call quality.

## Features

*   User authentication (Firebase).
*   Upload MP3 audio recordings.
*   AI-powered audio transcription (Genkit & Google AI).
*   AI-powered call quality evaluation (Genkit & Google AI).
*   Real-time updates on processing status (Firebase Firestore).
*   Display of transcription and evaluation results.

## Tech Stack

*   Next.js (v15 with Turbopack)
*   TypeScript
*   Firebase (Authentication, Firestore, Cloud Storage)
*   Genkit (with Google AI)
*   Tailwind CSS
*   Shadcn UI

## Prerequisites

*   Node.js (latest LTS version recommended)
*   npm (or yarn)
*   Firebase Account & Project:
    *   Authentication enabled
    *   Firestore database created
    *   Cloud Storage set up
*   Google Cloud Project with relevant AI APIs enabled (e.g., Speech-to-Text, Vertex AI or other models used by Genkit flows).
*   API keys for Google AI services, configured for Genkit.

## Getting Started / Setup

**1. Clone the repository:**
```bash
git clone <repository-url>
cd <repository-name>
```

**2. Install dependencies:**
```bash
npm install
```

**3. Configure Firebase:**
*   The Firebase client configuration is located in `src/lib/firebase/client.ts`.
*   You'll need to create a Firebase project and obtain your project's configuration object.
*   Replace the placeholder/existing configuration in `src/lib/firebase/client.ts` with your project's credentials.
*   Example of what you need:
    ```javascript
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };
    ```
*   Ensure Firestore has appropriate security rules. For development, you might start with open rules, but secure them for production.

**4. Configure Genkit & Google AI:**
*   Genkit AI flows are located in the `src/ai/` directory.
*   Ensure you have a Google Cloud Project set up and the necessary AI APIs enabled.
*   You may need to set environment variables or update configuration files within `src/ai/` for your Google AI API keys. Refer to Genkit and Google AI documentation for specifics.
*   The application uses `@genkit-ai/googleai`, so ensure your environment is authenticated (e.g., via `gcloud auth application-default login`).

## Running the Application

The application consists of a Next.js frontend and a Genkit backend for AI tasks.

**1. Run the Next.js development server:**
```bash
npm run dev
```
*   This will typically start the app on `http://localhost:9002`.

**2. Run the Genkit development server:**
```bash
npm run genkit:dev
```
*   Or `npm run genkit:watch` for auto-reloading on changes to AI flows.
*   This server handles the AI processing requests from the Next.js app.

## Building for Production

```bash
npm run build
npm run start
```

## Linting and Type Checking

*   Lint:
    ```bash
    npm run lint
    ```
*   Type Check:
    ```bash
    npm run typecheck
    ```

## Project Structure (Overview)

*   `src/app/`: Next.js pages and core application logic.
*   `src/components/`: Reusable React components (including Shadcn UI).
*   `src/lib/`: Utility functions, including Firebase setup (`src/lib/firebase/client.ts`).
*   `src/ai/`: Genkit AI flows (`evaluate-call-quality.ts`, `transcribe-audio.ts`) and configuration (`dev.ts`).
*   `docs/`: Additional project documentation (e.g., `blueprint.md`).
*   `public/`: Static assets.

## Contributing

Contributions are welcome! Please fork the repository, create a new branch for your feature or fix, and submit a pull request.

(Consider adding more specific guidelines if needed, e.g., coding style, commit message format).

## License

This project is currently unlicensed. Consider adding an MIT License.
```
MIT License

Copyright (c) [year] [fullname]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
