# **App Name**: SETU — AI Education Mediator

## Core Features:

- Role Selection and Context Management: Allows users to select their role (Child, Parent, Teacher) on the Welcome Screen, which then dictates the application's context and workflow. The chosen role is stored to maintain separate user experiences.
- Voice Input and Real-time Transcription: Enables users to record their voice messages via a large, animated microphone button, with real-time waveform visualization. The spoken words are then transcribed into text using AI for further processing.
- AI-Powered Message Mediation Pipeline: A multi-stage AI pipeline that processes recorded messages. This includes Speech-to-Text conversion, language Translation, Sentiment Detection, AI Mediation (rephrasing), and a Safety Check (tool for keyword scanning). Each step is visualized with animated progress.
- Original vs. Reframed Message Display: Presents the user's original message alongside the AI-reframed version, complete with sentiment badges (Negative, Neutral) and a clear arrow animation indicating the transformation. An explanation toggle provides insights into the reframing process.
- Parent-Facing Communication & Accessibility: Facilitates communication with parents by displaying the supportive, reframed message. Includes audio playback, a progress slider, and a timer. Offers language selection via a dropdown and a dedicated button to 'Listen in Marathi' for accessibility.
- Conversation History and Review: Provides a chronological timeline of all mediated conversations, featuring icons, timestamps, and scrollable content. This allows users to easily review past interactions and their outcomes.
- Robust Backend API for Mediation: Implements a dedicated backend API ('POST /api/mediate') responsible for orchestrating sentiment detection, message reframing, and safety keyword scanning. It returns the original and reframed messages, confidence scores, and explanations.
- Offline Data Persistence and Sync: Ensures continued functionality during network outages by detecting offline status, storing user data locally, and automatically syncing it with the backend once the connection is restored.
- Mobile-Native Navigation with Back Arrow: Provides an intuitive, mobile-app-like step-by-step navigation flow. Includes smooth page slide and fade transitions using Framer Motion, and a fixed, interactable 'ArrowLeft' back button in the top-left corner of all screens except the Welcome Screen, ensuring proper header layout alignment and keyboard support (ESC key).

## Style Guidelines:

- Primary Blue: '#4C8BE6' for main buttons, active states, microphone icon, and text on active elements. This is a vibrant, clear blue.
- Background Blue: '#F2F6FB' for the main application background, a very light, almost white, cool blue.
- Accent Blue: '#266AE6' for glows, highlights, and secondary interactive elements like the microphone's outer ring.
- Neutral Badge Green: '#4DBB54' for positive or neutral sentiment indicators.
- Negative Badge Red: '#EF454A' for negative sentiment indicators.
- Text Color: A dark desaturated blue/grey, e.g., '#3D546F', for readability across various text elements.
- Font Family: 'Inter' (sans-serif) for all text elements, chosen for its clean, modern, and highly legible appearance.
- Titles: Bold, larger font sizes for screen titles like 'Setu' and 'Processing Flow'.
- Body Text: Readable font sizes for message content and descriptions.
- Back Navigation: 'Lucide React' 'ArrowLeft' icon in a soft grey or blue, designed to be minimal and circular/rounded.
- Status Icons: Distinctive red (negative) and green (neutral) badges for sentiment indication. Animated tick marks for processing steps, descriptive icons, and a signal strength indicator icon.
- Functional Icons: Large microphone icon for voice input, play/pause for audio, and a language dropdown icon.
- Overall Design: 'Mobile card design' aesthetic with individual screens presented as rounded, elevated cards with subtle shadows.
- Centering: All primary UI elements are visually centered on the screen for a focused user experience.
- Buttons: Prominent, rounded buttons with blue gradients.
- Header Layout: Flex container ('display: flex; align-items: center; justify-content: space-between;') for screen headers to ensure the back arrow is top-left, while the title remains visually centered.
- Glassmorphism: Subtle glassmorphism effects applied to card backgrounds and interactive elements for a modern, layered look.
- Page Transitions: Smooth page slide (from left/right) and fade animations implemented using 'Framer Motion' for transitions between screens.
- Interactive Animations: Microphone button features a glowing effect during listening. Processing steps have animated tick marks. Arrow animation for message reframing. Hover glow for interactive elements, including the back button.