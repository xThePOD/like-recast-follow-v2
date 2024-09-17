import { Button, Frog } from 'frog';
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';
import { handle } from 'frog/vercel';

// Replace with your Neynar API Key
const NEYNAR_API_KEY = '63FC33FA-82AF-466A-B548-B3D906ED2314';
const TARGET_CAST_HASH = '0xd4c6ef7ed8658d8aea81def620e7698180f25aa7'; // The hash of the cast to check for likes and recasts
const TARGET_FID = '791835'; // Your FID to check if the user follows you

// Function to check if the user has liked, recasted, and followed you
const checkUserActions = async (userFid: string) => {
  const headers = {
    'accept': 'application/json',
    'api_key': NEYNAR_API_KEY,
  };

  // Check if the user has liked the cast
  const likeResponse = await fetch(`https://api.neynar.com/v2/farcaster/cast/likes?cast_hash=${TARGET_CAST_HASH}&viewer_fid=${userFid}`, { headers });
  const likeData = await likeResponse.json();
  const hasLiked = likeData.likes.some((like: any) => like.reactor_fid === userFid);

  // Check if the user has recasted the cast
  const recastResponse = await fetch(`https://api.neynar.com/v2/farcaster/cast/recasters?cast_hash=${TARGET_CAST_HASH}&viewer_fid=${userFid}`, { headers });
  const recastData = await recastResponse.json();
  const hasRecasted = recastData.recasters.some((recaster: any) => recaster.fid === userFid);

  // Check if the user is following you
  const followResponse = await fetch(`https://api.neynar.com/v1/farcaster/followers?fid=${TARGET_FID}&viewerFid=${userFid}`, { headers });
  const followData = await followResponse.json();
  const isFollowing = followData.result.followers.some((follower: any) => follower.fid === userFid);

  return { hasLiked, hasRecasted, isFollowing };
};

// Simple Enter Frame
export const app = new Frog({
  assetsPath: '/',
  basePath: '/api',
  title: 'Simple Enter Frame',
});

app.frame('/', async (c) => {
  // Access the user's FID from the context
  const userFid = c.frameData?.fid;
  if (!userFid) {
    return c.res({
      image: <div>User FID not found. Please try again.</div>,
      intents: [],
    });
  }

  if (c.buttonValue === 'enter') {
    const { hasLiked, hasRecasted, isFollowing } = await checkUserActions(userFid.toString());

    if (hasLiked && hasRecasted && isFollowing) {
      return c.res({
        image: (
          <div
            style={{
              alignItems: 'center',
              background: 'black',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              width: '100%',
            }}
          >
            <div
              style={{
                color: 'white',
                fontSize: 50,
                fontWeight: 'bold',
                marginBottom: 20,
              }}
            >
              Welcome to the Pod!
            </div>
          </div>
        ),
        intents: [],
      });
    }

    return c.res({
      image: (
        <div
          style={{
            alignItems: 'center',
            background: 'black',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            width: '100%',
          }}
        >
          <div
            style={{
              color: 'white',
              fontSize: 30,
              fontWeight: 'bold',
              marginBottom: 20,
            }}
          >
            Please make sure you have:
            <ul>
              <li>Liked the cast</li>
              <li>Recasted the cast</li>
              <li>Followed me</li>
            </ul>
          </div>
        </div>
      ),
      intents: [<Button value="enter">Check Again</Button>],
    });
  }

  return c.res({
    image: (
      <div
        style={{
          alignItems: 'center',
          background: 'black',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 50,
            fontWeight: 'bold',
            marginBottom: 20,
          }}
        >
          Press Enter
        </div>
      </div>
    ),
    intents: [<Button value="enter">Enter</Button>],
  });
});

// Set up development tools and static asset serving
const isEdgeFunction = process.env.VERCEL_ENV === 'production';
const isProduction = isEdgeFunction || process.env.NODE_ENV === 'production';
devtools(app, isProduction ? { assetsPath: '/.frog' } : { serveStatic });

export const GET = handle(app);
export const POST = handle(app);