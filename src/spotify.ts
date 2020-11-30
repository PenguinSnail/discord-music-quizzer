import SpotifyApi from 'spotify-web-api-node'

export default class Spotify {
    client = new SpotifyApi({
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET
    })

    async authorize() {
        const response = await this.client.clientCredentialsGrant()

        this.client.setAccessToken(response.body.access_token)

    }

    async getPlaylist(id: string) {
        let items: SpotifyApi.PlaylistTrackObject[] = [];

        const tracksCount = (await this.client.getPlaylist(id)).body.tracks.total
        console.log(tracksCount)
        for (let i = 0; i < tracksCount; i = i + 100) {
            const result = await this.client.getPlaylistTracks(id, {offset: i})
            result.body.items.forEach(track => {
                items.push(track)
            })
        }
        return items.map(({ track }) => track)
    }
}
