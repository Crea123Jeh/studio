
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioTower } from "lucide-react";

// New Spotify Playlist URL provided by user
const spotifyPlaylistUrl = "https://open.spotify.com/playlist/7vTZEzNyiocYAzkqHVnnWX?si=e51e121258d54392&pt=b578e1ae14a0eda7938e59906de1e694";
// Extract playlist ID from the URL
const playlistId = spotifyPlaylistUrl.substring(spotifyPlaylistUrl.lastIndexOf('/') + 1).split('?')[0];
// Construct the embed URL
const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;

export default function PpmRadioPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <RadioTower className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold font-headline tracking-tight">PPM Radio</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>PPM Radio Stream - Lofi Beats</CardTitle>
          <CardDescription>
            Tune in to a curated lofi playlist from Spotify. Use the controls within the player below.
          </CardDescription>
        </CardHeader>
        <CardContent className="aspect-video md:aspect-[16/6]">
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Spotify Playlist Player for PPM Radio"
            className="rounded-md shadow-md"
          ></iframe>
        </CardContent>
      </Card>
       <Card className="shadow-md mt-4">
        <CardHeader>
            <CardTitle className="text-lg">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Press the play button on the Spotify player above to start listening.</p>
            <p>The player has standard Spotify controls, including options for shuffle, repeat, and **volume adjustment**, which you can find within the player interface itself.</p>
            <p>The playlist is provided by Spotify. If you want to change the playlist, the playlist ID in the code for this page would need to be updated.</p>
        </CardContent>
      </Card>
    </div>
  );
}

