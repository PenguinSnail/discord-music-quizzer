import { MessageCollector, VoiceChannel, TextChannel, Guild, DMChannel } from 'discord.js';
import ytdl from 'ytdl-core'
import { CalibrateArgs } from './types/calibrate-args'
import { CommandoMessage } from 'discord.js-commando'
import Spotify from './spotify'
import { Song } from 'song'
import { VoiceConnection } from 'discord.js'
import internal from 'stream'
import { StreamDispatcher } from 'discord.js';
import * as db from './db'

const stopCommand = process.env.PREFIX + 'stop'
const skipCommand = process.env.PREFIX + 'skip'

export class Calibration {
    guild: Guild
    textChannel: TextChannel|DMChannel
    messageCollector: MessageCollector
    arguments: CalibrateArgs
    songs: Song[]
    currentSong: number = 0
    reactPermissionNotified: boolean = false

    constructor(message: CommandoMessage, args: CalibrateArgs) {
        this.guild = message.guild
        this.textChannel = message.channel
        this.arguments = args
    }

    async start() {
        this.songs = await this.getSongs(this.arguments.playlist)

        if (!this.songs || this.songs.length === 0) {
            if (this.songs && this.songs.length === 0) {
                await this.textChannel.send('Playlist contains no songs')
            }

            this.finish()

            return
        }

        this.currentSong = 0
        this.textChannel.send(`
            Type \`${stopCommand}\` to stop calibration.
            Type \`${skipCommand}\` to skip to the next song.
        `.replace(/  +/g, ''))
        this.startCalibration()

        this.messageCollector = this.textChannel
            .createMessageCollector((message: CommandoMessage) => !message.author.bot)
            .on('collect', message => this.handleMessage(message))
    }

    async startCalibration() {
        const song = this.songs[this.currentSong]

        await this.textChannel.send(`
            **(${this.currentSong + 1}/${this.songs.length})**
            > **${song.title}** by **${song.artist}**
        `.replace(/  +/g, ''))
    }

    async handleMessage(message: CommandoMessage) {
		const content = message.content
		let link = "";
        if (content === stopCommand) {
			this.textChannel.send('Calibration stopped!')
            await this.finish()
            return
        }

        if (content === skipCommand) {
            await this.nextSong()
            return
        }

		const song = this.songs[this.currentSong]
		if (content.includes('youtube.com')) {
			link = content.match(/watch\?v=([^&]+)/)[1]
			let success = false;
			try {
				ytdl(`https://www.youtube.com/watch?v=${link}`)
				success = true
            } catch (e) {
                console.error(e);
                this.textChannel.send('Could not stream the song from YouTube, try another link.')
			}
			
			if (success) {
				db.addSong(song.artist, song.title, link)
				this.nextSong()
			}
        }
    }

    async finish() {
        if (this.messageCollector) this.messageCollector.stop()
        if (this.guild.calibration) this.guild.calibration = null
    }

    nextSong() {
        if (this.currentSong + 1 === this.songs.length) {
            return this.finish()
        }

        this.currentSong++
        this.startCalibration()
    }
	
	// ---------------------

    async getSongs(playlist: string): Promise<Song[]> {
        const spotify = new Spotify()
        await spotify.authorize()
        if (playlist.includes('spotify.com/playlist')) {
            playlist = playlist.match(/playlist\/([^?]+)/)[1] || playlist
        }

        try {
            const fullList = await spotify.getPlaylist(playlist)
            return fullList.map(song => ({
                    link: `https://open.spotify.com/track/${song.id}`,
                    previewUrl: song.preview_url,
                    title: this.stripSongName(song.name),
                    artist: (song.artists[0] || {}).name,
                    duration: song.duration_ms
                }))
        } catch (error) {
            this.textChannel.send('Could not retrieve the playlist. Make sure it\'s public')

            return null
        }
	}

    /**
     * Will remove all excess from the song names
     * Examples:
     * death bed (coffee for your head) (feat. beabadoobee) -> death bed
     * Dragostea Din Tei - DJ Ross Radio Remix -> Dragostea Din Tei
     *
     * @param name string
     */
    stripSongName(name: string): string {
        return name.replace(/ \(.*\)/g, '')
            .replace(/ - .*$/, '')
    }
}
