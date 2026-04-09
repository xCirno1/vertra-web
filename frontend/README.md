# Vertra Web Game Engine

A professional, project-based Web Game Engine interface for the Vertra Rust/Wasm-based 3D batch renderer.

## Features

- **4-Panel Studio Layout**: Scene tree, 3D viewport, inspector, and asset browser
- **Dark Studio Theme**: Professional aesthetics with cyan/teal gradient accents
- **Scene Management**: Hierarchical scene graph with drag-drop support
- **Transform Tools**: Translate, Rotate, Scale with numeric inputs
- **Real-time Inspector**: Edit entity properties (position, rotation, scale, materials)
- **Asset Browser**: Manage 3D assets and materials
- **Wasm Bridge**: Integration with Vertra Rust renderer
- **Persistence**: Supabase cloud storage + LocalStorage fallback
- **Export**: Save scenes as .vertra (JSON) or PNG screenshots

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **UI**: Shadcn UI, Radix UI, Tailwind CSS
- **State**: Zustand with Immer middleware
- **3D Graphics**: React Three Fiber (R3F), Three.js
- **Animations**: Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Type Safety**: TypeScript (strict mode)
- **Icons**: Lucide React

## Project Structure

```
app/
├── (auth)              # Authentication routes
├── (studio)            # Protected studio routes
│   ├── projects/       # Project listing & editor
│   └── layout.tsx
├── api/                # API endpoints
│   └── vertra/         # Wasm bridge endpoints
├── components/
│   ├── layouts/        # Main 4-panel layout
│   ├── studio/         # Studio-specific components
│   ├── ui/             # Shadcn components
│   └── common/         # Shared utilities
├── stores/             # Zustand stores
├── hooks/              # Custom React hooks
├── lib/                # Utilities and helpers
│   ├── scene/          # Scene manipulation
│   ├── storage/        # DB/Cache adapters
│   ├── export/         # Export formatters
│   └── constants/      # Theme, shortcuts
├── types/              # TypeScript definitions
└── globals.css         # Global styles
```

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

### Type Checking

```bash
npm run type-check
```

## Phases

### Phase 1: ✅ Foundation
- Next.js 14 project setup
- Supabase authentication
- Tailwind CSS theming
- TypeScript strict mode

### Phase 2: ✅ 4-Panel Layout
- Main studio grid layout
- Responsive design
- Framer Motion animations
- Dynamic resizing

### Phase 3: ✅ Scene Data Model
- Zustand stores (scene, UI, selection)
- Entity hierarchy
- Transform management
- Undo/Redo system

### Phase 4: WIP - Scene Tree UI
- [x] Basic hierarchy rendering
- [ ] Drag-drop reorenting
- [ ] Context menus
- [ ] Multi-selection

### Phase 5: TODO - 3D Viewport
- [ ] React Three Fiber canvas
- [ ] Entity mesh rendering
- [ ] Camera controller
- [ ] Raycasting selection

### Phase 6: TODO - Inspector & Tools
- [ ] Transform gizmos
- [ ] Material editor
- [ ] Numeric property inputs
- [ ] Tool modes (translate/rotate/scale)

### Phase 7: TODO - Asset Management
- [ ] Asset browser
- [ ] PNG screenshot export
- [ ] Save/load scenes
- [ ] Polish and optimization

## API Routes

### `/api/vertra/module`
GET - Fetch the compiled Wasm module

### `/api/vertra/render`
POST - Render a scene and return frame buffer

### `/api/projects`
GET/POST - List and create projects
GET `/:id` - Fetch specific project
PUT `/:id` - Update project
DELETE `/:id` - Delete project

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Translate | `G` |
| Rotate | `R` |
| Scale | `S` |
| Delete | `Delete` |
| Duplicate | `Shift+D` |
| Undo | `Ctrl+Z` |
| Redo | `Ctrl+Shift+Z` |
| Save | `Ctrl+S` |
| Export | `Ctrl+E` |
| Deselect | `Escape` |

## Deployment

The project is configured for deployment on Vercel:

```bash
vercel deploy
```

## License

Proprietary - Vertra Project
