import axios from 'axios';

const clientId = '775da9ed4ec449a0af36d935bb12f081';
const clientSecret = '3ed4b92dec29418fb341206bb56eab72';
// const redirectUri = 'http://localhost:3000/callback';
const redirectUri = 'https://github.com/yassina1/quranFinderPro.git';
const authorizeUrl = 'https://accounts.spotify.com/authorize';
const tokenUrl = 'https://accounts.spotify.com/api/token';

let accessToken;

const getAuthorizationCode = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
};

const exchangeCodeForToken = async (code) => {
  try {
    const response = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    accessToken = response.data.access_token;
    return accessToken;
  } catch (error) {
    console.error(
      'Error exchanging authorization code for access token:',
      error
    );
    throw error;
  }
};

const Spotify = {
  async getAccessToken() {
    if (accessToken) {
      return accessToken;
    }

    const code = getAuthorizationCode();
    if (code) {
      accessToken = await exchangeCodeForToken(code);
      window.history.pushState('Access Token', null, '/');
      return accessToken;
    } else {
      const accessUrl = `${authorizeUrl}?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=playlist-modify-public`;
      window.location = accessUrl;
    }
  },

  async search(term) {
    const accessToken = await this.getAccessToken();
    try {
      const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          type: 'track',
          q: term,
        },
      });
      const jsonResponse = response.data;
      if (!jsonResponse.tracks) {
        return [];
      }
      return jsonResponse.tracks.items.map((track) => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        uri: track.uri,
      }));
    } catch (error) {
      console.error('Error searching tracks:', error);
      throw error;
    }
  },

  async savePlaylist(name, trackUris) {
    if (!name || !trackUris.length) {
      return;
    }

    const accessToken = await this.getAccessToken();
    const headers = { Authorization: `Bearer ${accessToken}` };
    let userId;

    try {
      const userResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers,
      });
      userId = userResponse.data.id;

      const createPlaylistResponse = await axios.post(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        { name: name },
        { headers }
      );
      const playlistId = createPlaylistResponse.data.id;

      await axios.post(
        `https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`,
        { uris: trackUris },
        { headers }
      );
    } catch (error) {
      console.error('Error saving playlist:', error);
      throw error;
    }
  },
};

export default Spotify;
