# Script Speaker

Script Speaker is a web application designed to help content creators, particularly for video production, to hear how their scripts sound. It takes unstructured script text, parses it using Gemini on Vertex AI (though this specific integration point is conceptual for this version of the backend code), and then converts the processed text into natural-sounding speech using Google Cloud's Text-to-Speech API. Users can select from a variety of voices and languages to get a better feel for their script's delivery.

## Table of Contents

1.  [Overview](#overview)
2.  [Technologies Used](#technologies-used)
3.  [How It Works (Simplified)](#how-it-works-simplified)
4.  [Prerequisites](#prerequisites)
5.  [Project Setup](#project-setup)
    - [Frontend (React)](#frontend-react)
    - [Backend (Flask)](#backend-flask)
6.  [Running Locally](#running-locally)
7.  [Deployment to Google Cloud Run](#deployment-to-google-cloud-run)

## Overview

The application consists of a React frontend where users input their script. The Flask backend (conceptually) first processes this script using Gemini on Vertex AI to structure it for speech synthesis. It then communicates with the Google Cloud Text-to-Speech API to generate audio and serves the frontend application along with the audio output.

## Technologies Used

- **Backend**:
  - Python 3.x
  - Flask (Web framework)
  - Google Cloud Text-to-Speech API client library
  - Google Cloud Vertex AI SDK (for Gemini integration - `google-cloud-aiplatform`)
- **Frontend**:
  - React (JavaScript library for UI)
  - (Presumably HTML, CSS, JavaScript)
- **Deployment**:
  - Google Cloud Run
  - Docker (implied for Cloud Run deployment from source)

## How It Works (Simplified)

```
User (Browser - React App)                     Flask Backend (Python)                     Google Cloud TTS API
--------------------------                     ----------------------                     --------------------
1. Visits page
   --------------------------------------------> Serves React App (index.html, static assets)
                                               <--------------------------------------------

2. Page loads, requests voice list
   ------------------ (GET /list_voices) ----->
                                               | 3. Requests voices from Google
                                               -------------------------------------------->
                                                                                          |
                                               <--------------------------------------------
                                               | 4. Returns voice list to Flask
   <----------------- (JSON voice list) ------
   | 5. User enters text, selects voice,
   |    clicks "Generate Audio"

6. Sends text & voice choice
   ---------------- (POST /generate_audio) --->
                                               | 7. Requests speech synthesis from Google
                                               -------------------------------------------->
                                                                                          |
                                               <--------------------------------------------
                                               | 8. Returns audio data to Flask
   <----------------- (Audio stream) ---------
   | 9. Plays audio in browser

```

## Prerequisites

- **Google Cloud Platform (GCP) Account**:
  - A GCP Project with Billing enabled.
  - **Text-to-Speech API enabled** in your GCP project.
  - Google Cloud SDK (`gcloud` CLI) installed and authenticated (`gcloud auth login`, `gcloud config set project YOUR_PROJECT_ID`).
- **Node.js and npm (or yarn)**: For managing frontend dependencies and building the React app. (Typically install from nodejs.org)
- **Python 3.x and pip**: For the Flask backend.
- **Git**: For version control.

## Project Setup

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <your-repository-url>
    cd script-speaker
    ```

### Frontend (React)

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or if you use yarn:
    # yarn install
    ```
3.  **Build the frontend for production:**
    This step creates an optimized build in the `frontend/build` directory, which Flask will serve.
    ```bash
    npm run build
    # or if you use yarn:
    # yarn build
    ```
4.  **Return to the project root directory:**
    ```bash
    cd ..
    ```

### Backend (Flask)

1.  **Create and activate a Python virtual environment (recommended):**
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
2.  **Install Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
3.  **Google Application Credentials (for local development):**
    If you are running locally and not using `gcloud auth application-default login`, you might need to set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to your service account key JSON file.
    ```bash
    # Example:
    # export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
    # For Cloud Run, this is typically handled by the service account associated with the Cloud Run service.
    ```

## Running Locally

After completing the frontend build and backend setup:

1.  **Ensure your Google Application Credentials are set up if needed.**
2.  **Run the Flask application from the project root directory:**
    ```bash
    python main.py
    ```
    The application will typically be available at `http://127.0.0.1:8080` (or the port specified in `main.py`). Flask will serve the React frontend from `frontend/build`.

## Deployment to Google Cloud Run

This guide assumes you have a `Dockerfile` in your project root that correctly sets up your Python environment, copies the application code (including the `frontend/build` directory), and specifies how to run the Flask app (e.g., using `gunicorn`).

1.  **Ensure you have built your React frontend:**
    ```bash
    cd frontend
    npm run build
    cd ..
    ```
2.  **Make sure your `gcloud` CLI is authenticated and configured for the correct project:**
    ```bash
    gcloud auth login
    gcloud config set project YOUR_PROJECT_ID
    ```
3.  **Deploy to Cloud Run using the `gcloud` CLI from your project's root directory:**

    ```bash
    gcloud run deploy script-speaker \
        --source . \
        --platform managed \
        --region YOUR_PREFERRED_REGION \
        --allow-unauthenticated
    ```

    - `script-speaker`: Choose a name for your Cloud Run service.
    - `--source .`: Tells Cloud Run to build a container image from the source code in the current directory (requires a `Dockerfile`).
    - `--platform managed`: Specifies the fully managed Cloud Run environment.
    - `--region YOUR_PREFERRED_REGION`: Replace with your desired GCP region (e.g., `us-central1`, `europe-west1`).
    - `--allow-unauthenticated`: Allows public access to your service. Remove this flag if you want to manage access through IAM.

    You may be prompted to enable APIs like Artifact Registry and Cloud Build if they are not already enabled.

4.  **After deployment, `gcloud` will provide you with the URL of your deployed service.**

---

This README provides a comprehensive guide to understanding, setting up, running, and deploying your Script Speaker application.
