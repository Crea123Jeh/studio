
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioTower } from "lucide-react";

// Example Spotify Playlist URI (Chill Vibes)
const spotifyPlaylistUri = "spotify:playlist:37i9dQZF1DX6VdMW310YC7";
// Convert URI to embed URL
const embedUrl = `https://open.spotify.com/embed/playlist/${spotifyPlaylistUri.split(':')[2]}`;

export default function PpmRadioPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <RadioTower className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold font-headline tracking-tight">PPM Radio</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>PPM Radio Stream</CardTitle>
          <CardDescription>Tune in to a curated Spotify playlist. Use the controls in the player to play, pause, and shuffle.</CardDescription>
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
            <p>The player has standard Spotify controls, including options for shuffle and repeat, which you can find within the player interface.</p>
            <p>If you want to change the playlist, you would need to update the playlist ID in the code for this page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
