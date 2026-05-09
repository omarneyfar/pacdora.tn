# Pacdora TN MVP

A modern web application for designing and visualizing 3D carton packaging projects. Create, edit, and preview custom carton designs with artwork cropping, multi-face support, and real-time 3D visualization.

## Features

- **3D Carton Visualization**: Interactive 3D preview of carton designs using Three.js
- **Multi-Face Design**: Edit artwork for all 6 faces of a carton (front, back, left, right, top, bottom)
- **Artwork Management**: Upload and manage image and PDF artwork sources
- **Advanced Cropping**: Built-in image cropping with support for rotation and flipping
- **Project Management**: Create, save, edit, and view carton projects
- **Cloud Storage**: Optional Supabase integration for production deployments
- **Local Storage**: Local JSON-based storage for development and offline use
- **PDF Support**: Native PDF handling and conversion to images
- **Responsive Design**: Modern UI with Lucide React icons

## Tech Stack

### Core Framework
- **Next.js 16**: React framework with built-in routing and API capabilities
- **React 19**: UI library
- **TypeScript**: Type-safe development

### 3D & Visualization
- **Three.js**: 3D graphics library
- **@react-three/fiber**: React renderer for Three.js
- **@react-three/drei**: Useful utilities for React Three Fiber
- **pdfjs-dist**: PDF rendering and processing

### Utilities & Libraries
- **Supabase**: Backend-as-a-service (optional, for production)
- **advanced-cropper/react-advanced-cropper**: Image cropping tools
- **Lucide React**: Icon library

### Development Tools
- **ESLint**: Code linting
- **Playwright**: End-to-end testing
- **TypeScript Compiler**: Type checking

## Project Structure

```
pacdora-tn/
  renderProjectFaces,
│   ├── api/                          # API routes
│   │   ├── projects/                 # Project CRUD endpoints
│   │   ├── project-faces/            # Face-specific endpoints
│   │   └── project-assets/           # Asset management endpoints
│   ├── project/[id]/edit/            # Project editing page
│   ├── view/[id]/                    # Project viewing page
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Main builder interface
│   └── globals.css                   # Global styles
├── components/
│   ├── Builder.tsx                   # Main builder component
│   ├── CartonStage.tsx               # 3D carton visualization
│   └── ProjectViewer.tsx             # Project preview component
├── lib/
│   ├── carton.ts                     # Carton types and constants
│   ├── client/
│   │   └── artwork.ts                # Client-side artwork utilities
│   └── server/
│       └── projects.ts               # Server-side project logic
├── storage/
│   ├── projects-db.json              # Local project metadata
│   └── projects/                     # Local project files
├── supabase/
│   └── schema.sql                    # Database schema
├── types/
│   └── pdfjs-dist-webpack.d.ts       # PDF.js type definitions
└── scripts/
    └── verify-visual.mjs             # Visual verification script
```

## Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pacdora-tn
```

type SourcePayload = {s:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

For local development (recommended for getting started), you can leave the Supabase environment variables empty. The application will use local JSON storage.
  fileName: string;
### Configuration

**Local Development (Default)**
- Metadata is saved to `storage/projects-db.json`
- Images are stored to `storage/projects/`
- No external services required

**Production (With Supabase)**
Add the following to `.env.local`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECTS_BUCKET=project-faces
SUPABASE_PROJECTS_TABLE=projects
```

### Development

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the builder.

### Building for Production

```bash
npm run build
npm start
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build optimized production bundle |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint to check code quality |
| `npm run verify:visual` | Run visual verification tests |

## API Routes

### Projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project

### Project Faces
  const lastSavedProjectRef = useRef<Project | null>(null);artwork
- `POST /api/project-faces/[id]/[face]` - Upload/update face artwork

### Project Assets
- `GET /api/project-assets/[id]/[asset]` - Get asset resource
- `POST /api/project-assets/[id]/[asset]` - Upload asset

## Core Concepts

### Carton Faces
Projects support 6 carton faces that can be designed independently:
- **front**: Front face of the carton
- **back**: Back face of the carton
- **left**: Left side panel
- **right**: Right side panel
- **top**: Top surface
- **bottom**: Bottom surface

### Artwork Management
- **Sources**: Original artwork files (images or PDFs)
- **Assets**: Processed artwork ready for specific faces
- **Cropping**: Define custom crop areas, rotation, and flipping for each face

### Dimensions
Cartons are defined by three dimensions:
- **width**: Horizontal dimension
- **height**: Vertical dimension
- **depth**: Depth dimension

## Usage

          await hydrateProject(project);main builder interface
2. **Set Dimensions**: Define your carton dimensions
3. **Upload Artwork**: Add image or PDF sources to your workspace
4. **Crop & Position**: Use the cropping tool to adjust artwork for each face
5. **Preview**: Use the 3D viewer to see your carton design
6. **Save**: Save your project locally or to Supabase
7. **Export**: View or share your completed carton design

## Database Schema

The project uses the following table structure (Supabase):
```sql
projects
├── id (text, primary key)
├── name (text)
├── dimensions (jsonb)
├── faces (jsonb)
├── workspace (jsonb)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

## Development Notes

- The application uses Next.js runtime for API routes with Node.js compatibility
- URL rewrites are configured to provide clean API endpoints
- Turbopack is used for optimized build performance
- React Strict Mode is enabled for development
- Local storage is built on JSON files for simplicity and portability
    if (skipNextDimensionSync.current) {
## Troubleshooting

**Port Already in Use**: If port 3000 is already in use, Next.js will automatically use the next available port.

**Missing Supabase Config**: The app will fall back to local JSON storage automatically if Supabase variables are not set.

**PDF Rendering Issues**: Ensure `pdfjs-dist` is properly installed and the worker file is accessible.

## License

Private project - All rights reserved

## Contributing

Please follow the existing code style and ensure all tests pass before submitting pull requests.

---

**Version**: 0.1.0 (MVP)  
**Last Updated**: May 2026
      const payload = projectId ? createProjectPatchPayload() : createFullProjectPayload();  function createFullProjectPayload(): ProjectSavePayload {    skipNextDimensionSync.current = true;            <ArtworkLibraryfunction createSavedPayloadFromProject(project: Project): ProjectSavePayload {            if (!asset || !asset.sourceId) {      WorkSpace  async function hydrateProject(project: Project) {    WorkSpace