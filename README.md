# MKEvents

**Discover the best local events, concerts, and activities happening in Milwaukee!**

MKEvents is a modern, responsive web application that helps you discover and manage events across Milwaukee's vibrant neighborhoods. Built with React, TypeScript, and Vercel Postgres, it offers personalized recommendations, event filtering, and social features.

![MKEvents](https://img.shields.io/badge/MKEvents-Live-brightgreen)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)
![Vite](https://img.shields.io/badge/Vite-5.4.19-purple)

## Features

### Core Functionality
- **Event Discovery**: Browse featured and trending events across Milwaukee
- **Smart Recommendations**: AI-powered event recommendations based on your interests and location
- **Region-Based Filtering**: Filter events by neighborhood (Downtown, East Side, Walker's Point, Third Ward)
- **Genre Filtering**: Find events by category (Music, Sports, Business, Comedy, Food, and more)
- **Date Range Filtering**: Search events by specific date ranges
- **Event Details**: Comprehensive event pages with images, descriptions, and organizer info

### User Features
- **User Authentication**: Sign up and log in to save your preferences
- **Multiple Profiles**: Create and switch between multiple user profiles
- **Save Events**: Bookmark events for later
- **Attend Events**: Mark events you plan to attend
- **User Profile**: Manage your saved and attending events
- **Personalized Dashboard**: Get insights into your event preferences
- **Event Comparison**: Compare multiple events side-by-side
- **Map View**: Visualize event locations on an interactive map

### UI/UX
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- **Accessibility**: Fully accessible with keyboard navigation support

### Social & Integration
- **Social Sharing**: Share events on Facebook, Twitter, Email, or copy link
- **Calendar Integration**: Add events to Google Calendar or download iCal files
- **Event Reminders**: Set custom reminders for upcoming events
- **Get Directions**: Quick access to event locations with Google Maps

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Vercel account (for database and API hosting)
- Git

### Installation

1. **Clone the repository**
   ```sh
   git clone https://github.com/vishesh1802/MKEventss.git
   cd MKEventsss
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` or `.env.local` file in the root directory:
   ```env
   POSTGRES_URL=your_vercel_postgres_url
   POSTGRES_PRISMA_URL=your_vercel_postgres_prisma_url
   POSTGRES_URL_NON_POOLING=your_vercel_postgres_non_pooling_url
   PASSWORD_SALT=your_secure_random_salt_string
   ```
   
   **Note**: `PASSWORD_SALT` is optional for development but recommended. Generate a random string for production.

4. **Set up the database**
   
   Initialize database tables (creates users, profiles, sessions tables):
   ```sh
   npx tsx scripts/init-db.ts
   ```
   
   Then populate the database with event data:
   ```sh
   npm run upload-data
   ```

5. **Start the development server**
   ```sh
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

### Running with Vercel

For full API functionality, run Vercel dev server alongside the Vite dev server:

```sh
# Terminal 1: Start Vercel dev server (for API routes)
vercel dev

# Terminal 2: Start Vite dev server (for frontend)
npm run dev
```

## Project Structure

```
MKEventsss/
├── api/                 # API routes (Vercel serverless functions)
│   ├── auth/           # Authentication endpoints
│   │   ├── login.ts    # User login
│   │   ├── signup.ts   # User registration
│   │   ├── logout.ts   # User logout
│   │   └── me.ts       # Get current user
│   ├── events/         # Event-related endpoints
│   ├── events.ts       # Get all events
│   ├── profiles.ts     # User profile management
│   └── recommend.ts    # Event recommendations
├── src/
│   ├── components/     # React components
│   │   ├── ui/        # shadcn/ui components
│   │   ├── EventCard.tsx
│   │   ├── FilterBar.tsx
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── contexts/       # React contexts
│   │   ├── AuthContext.tsx        # Authentication state
│   │   ├── ProfileContext.tsx     # User profile management
│   │   └── SavedEventsContext.tsx # Saved events state
│   ├── pages/          # Page components
│   │   ├── Index.tsx
│   │   ├── Discover.tsx
│   │   ├── Recommendations.tsx
│   │   ├── EventDetail.tsx
│   │   ├── Login.tsx
│   │   ├── Profile.tsx
│   │   ├── MapView.tsx
│   │   ├── CompareEvents.tsx
│   │   └── Dashboard.tsx
│   ├── utils/          # Utility functions
│   │   ├── calendar.ts
│   │   ├── reminders.ts
│   │   └── share.ts
│   └── App.tsx         # Main app component
├── scripts/            # Database setup scripts
│   ├── setup.ts
│   └── Event_data.csv
└── package.json
```

## Tech Stack

### Frontend
- **React 18.3.1** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **next-themes** - Dark mode support
- **Lucide React** - Icons
- **TanStack Query** - Data fetching and caching

### Backend
- **Vercel Serverless Functions** - API endpoints
- **Vercel Postgres** - Database
- **@vercel/postgres** - Database client

### Additional Libraries
- **date-fns** - Date manipulation
- **react-hook-form** - Form handling
- **zod** - Schema validation
- **recharts** - Data visualization (dashboard)

## Pages & Routes

- `/` - Home page with featured and trending events
- `/discover` - Browse all events with advanced filters
- `/recommendations` - AI-powered event recommendations
- `/events/:id` - Event detail page
- `/login` - User authentication (sign up and login)
- `/profile` - User profile with saved and attending events
- `/map` - Interactive map view of events
- `/compare` - Compare multiple events
- `/dashboard` - Personalized user dashboard

## Key Features Explained

### Event Recommendations
The recommendation system uses:
- **Genre similarity matching** - Finds events similar to your interests
- **Location-based filtering** - Prioritizes events in your preferred regions
- **Date filtering** - Shows only future events
- **Interleaving algorithm** - Ensures diverse results when multiple genres are selected

### Region Mapping
Events are mapped to regions based on venue coordinates:
- **Downtown**: lat 43.038-43.045, lon -87.92 to -87.89
- **Third Ward**: lat 43.0335-43.0345, lon -87.9335 to -87.9325
- **Walker's Point**: lat 43.0515-43.053, lon -87.906 to -87.904
- **East Side**: lat 43.0755-43.077, lon -87.881 to -87.879

### Data Storage
- **User Accounts**: Stored in Vercel Postgres database (users table)
- **User Profiles**: Stored in Vercel Postgres database (user_profiles table) for authenticated users, localStorage for guests
- **User Sessions**: Stored in Vercel Postgres database (user_sessions table)
- **Saved Events**: Stored in browser localStorage
- **Attending Events**: Stored in browser localStorage
- **Event Data**: Stored in Vercel Postgres database

## Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```sh
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your GitHub repository
   - Add environment variables
   - Deploy!

3. **Set up Database**
   - Create a Vercel Postgres database in Vercel Dashboard
   - Add environment variables in Vercel:
     - `POSTGRES_URL` (automatically added when you create Postgres database)
     - `PASSWORD_SALT` (generate a random string)
   - After deployment, initialize database tables:
     ```sh
     vercel env pull
     npx tsx scripts/init-db.ts
     npm run upload-data
     ```

The app will be automatically deployed on every push to the main branch.


## License

This project is open source and available under the [MIT License](LICENSE).

## Author

**Vishesh**

- Made with love by Vishesh
- GitHub: [@vishesh1802](https://github.com/vishesh1802)

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Vercel](https://vercel.com/) for hosting and database
- [Lucide](https://lucide.dev/) for the icon library


## Support

If you have any questions or issues, please open an issue on GitHub.

---

**Enjoy discovering events in Milwaukee!**
