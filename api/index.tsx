import { Button, Frog } from 'frog';
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';
import { handle } from 'frog/vercel';

// Replace with your Neynar API Key
const NEYNAR_API_KEY = '63FC33FA-82AF-466A-B548-B3D906ED2314';

// Function to validate user actions using Neynar's validate-frame API
const validateUserActions = async (userFid: string, messageHash: string) => {
  const headers = {
    'accept': 'application/json',
    'api_key': NEYNAR_API_KEY,
  };

  const body = {
    fid: userFid,
    message_bytes: messageHash, // Using messageHash instead of messageBytes
    context_flags: ['cast_reaction', 'follow'], // Flags to check (e.g., follow, like)
  };

  try {
    const response = await fetch('https://api.neynar.com/v2/farcaster/validate-frame', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    // Check if the response is not JSON (like an HTML error page)
    if (!response.ok) {
      const errorText = await response.text(); // Log the actual response text for debugging
      console.error(`Error response from Neynar API: ${errorText}`);
      throw new Error(`Neynar API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Extract and return the context flags
    const hasLiked = data.context_flags.cast_reaction;
    const isFollowing = data.context_flags.follow;
    
    return { hasLiked, isFollowing };
  } catch (error) {
    console.error("Failed to validate user actions: ", error);
    throw error; // Rethrow error so the calling function can handle it
  }
};

// Create the main app
export const app = new Frog({
  assetsPath: '/',
  basePath: '/api',
  title: 'Like, Recast, Follow Validator',
});

// Define the main frame logic
app.frame('/', async (c) => {
  const { buttonValue, status } = c;

  // Initial frame
  if (status === 'initial' || buttonValue !== 'enter') {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: 'black', color: 'white', fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Welcome!</h1>
          <p style={{ fontSize: '24px', marginBottom: '30px' }}>Press Enter to check your actions</p>
        </div>
      ),
      intents: [<Button value="enter">Enter</Button>],
    });
  }

  // Get user FID and message hash from the context
  const userFid = c.frameData?.fid;
  const messageHash = c.frameData?.messageHash; // Use messageHash instead of messageBytes

  // Handle missing data
  if (!userFid || !messageHash) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: 'black', color: 'white', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>Error</h2>
          <p style={{ fontSize: '24px', marginBottom: '30px' }}>User FID or message hash not found. Please try again.</p>
        </div>
      ),
      intents: [<Button>Try Again</Button>],
    });
  }

  try {
    // Validate user actions using Neynar's validate-frame API
    const { hasLiked, isFollowing } = await validateUserActions(userFid.toString(), messageHash);

    // Respond with success if the user has liked and is following
    if (hasLiked && isFollowing) {
      return c.res({
        image: (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: 'black', color: 'white', fontFamily: 'sans-serif' }}>
            <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Welcome to the Pod!</h1>
            <p style={{ fontSize: '24px', marginBottom: '30px' }}>You've completed all required actions.</p>
          </div>
        ),
      });
    }

    // If the user hasn't completed all actions, show what is missing
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: 'black', color: 'white', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>Actions Required</h2>
          <p style={{ fontSize: '24px', marginBottom: '10px' }}>Please make sure you have:</p>
          <ul style={{ fontSize: '20px', listStyleType: 'none', padding: 0 }}>
            <li style={{ marginBottom: '5px' }}>✅ {hasLiked ? 'Liked' : '❌ Not liked'} the cast</li>
            <li style={{ marginBottom: '5px' }}>✅ {isFollowing ? 'Followed' : '❌ Not following'} me</li>
          </ul>
        </div>
      ),
      intents: [<Button>Check Again</Button>],
    });
  } catch (error) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: 'black', color: 'white', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>Error</h2>
          <p style={{ fontSize: '24px', marginBottom: '30px' }}>Failed to validate actions. Please try again later.</p>
        </div>
      ),
      intents: [<Button>Try Again</Button>],
    });
  }
});

// Handle environment and serve static content in development
const isEdgeFunction = process.env.VERCEL_ENV === 'production';
const isProduction = isEdgeFunction || process.env.NODE_ENV === 'production';
devtools(app, isProduction ? { assetsPath: '/.frog' } : { serveStatic });

// Export GET and POST handlers for Vercel
export const GET = handle(app);
export const POST = handle(app);
