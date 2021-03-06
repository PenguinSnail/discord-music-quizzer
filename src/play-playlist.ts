import { MessageCollector, VoiceChannel, TextChannel, Guild, DMChannel } from 'discord.js';
import ytdl from 'ytdl-core'
import { PlayArgs } from './types/play-args'
import { CommandoMessage } from 'discord.js-commando'
import Spotify from './spotify'
import { Song } from 'song'
import { VoiceConnection } from 'discord.js'
import internal from 'stream'
import { StreamDispatcher } from 'discord.js';
import * as db from './db'

const stopCommand = process.env.PREFIX + 'stop'
const skipCommand = process.env.PREFIX + 'skip'

export class PlayPlaylist {
    guild: Guild
    textChannel: TextChannel|DMChannel
    voiceChannel: VoiceChannel
    messageCollector: MessageCollector
    arguments: PlayArgs
    songs: Song[]
    currentSong: number = 0
    connection: VoiceConnection
    musicStream: internal.Readable
    voiceStream: StreamDispatcher
    reactPermissionNotified: boolean = false
    link: string

    constructor(message: CommandoMessage, args: PlayArgs) {
        this.guild = message.guild
        this.textChannel = message.channel
        this.voiceChannel = message.member.voice.channel
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

        try {
            this.connection = await this.voiceChannel.join()
        } catch (e) {
            await this.textChannel.send('Could not join voice channel. Is it full?')
            await this.finish()

            return
        }

        this.currentSong = 0
        this.startPlaying()

        this.messageCollector = this.textChannel
            .createMessageCollector((message: CommandoMessage) => !message.author.bot)
            .on('collect', message => this.handleMessage(message))
    }

    async startPlaying() {

        const song = this.songs[this.currentSong]
        this.link = this.findSong(song)
        if (this.link && typeof this.link === "string" && this.link !== "") {
            try {
                this.musicStream = await ytdl(`https://www.youtube.com/watch?v=${this.link}`)
            } catch (e) {
				console.error(e);
				await this.textChannel.send(`Could not stream **${song.title}** by **${song.artist}** from Youtube. Skipping to next.`.replace(/  +/g, ''))
                this.nextSong()
                return
            }
        } else {
			await this.textChannel.send(`Could not find **${song.title}** by **${song.artist}** on Youtube. Skipping to next.`.replace(/  +/g, ''))
            this.nextSong()
            return
        }

        this.printStatus()

        try {
            this.voiceStream = this.connection.play(this.musicStream, { volume: .5 })

            this.voiceStream.on('error', () => {
                    this.textChannel.send('Connection got interrupted. Please try again')

                    this.finish()
                })
            this.voiceStream.on('finish', () => this.nextSong())
            this.voiceStream
        } catch (e) {
            console.error(e);

            this.textChannel.send('Connection got interrupted. Please try again')

            this.finish()
        }
    }

    async handleMessage(message: CommandoMessage) {
        const content = message.content.toLowerCase()
        if (content === stopCommand) {
            await this.finish()
            return
        }

        if (content === skipCommand) {
            await this.handleSkip()
            return
        }
    }

    handleSkip() {
            this.nextSong()
            return
    }

    async finish() {
        if (this.messageCollector) this.messageCollector.stop()
        if (this.voiceStream) this.voiceStream.destroy()
        if (this.musicStream) this.musicStream.destroy()

        if (this.guild.play) this.guild.play = null
        this.voiceChannel.leave()
    }

    nextSong() {
        if (this.currentSong + 1 === this.songs.length) {
            return this.finish()
        }

        this.currentSong++
        if (this.musicStream) this.musicStream.destroy()
        if (this.voiceStream) this.voiceStream.destroy()
        this.startPlaying()
    }

    async printStatus() {
		const song = this.songs[this.currentSong]
		const next = this.songs[this.currentSong + 1]
        await this.textChannel.send(`
            Now Playing: **${song.title}** by **${song.artist}**
            Link: ${song.link}
            YouTube: https://www.youtube.com/watch?v=${this.link}

            Up Next: **${next.title}** by **${next.artist}**
        `.replace(/  +/g, ''))
    }

    async getSongs(playlist: string): Promise<Song[]> {
        const spotify = new Spotify()
        await spotify.authorize()
        if (playlist.includes('spotify.com/playlist')) {
            playlist = playlist.match(/playlist\/([^?]+)/)[1] || playlist
        }

        try {
            const fullList = await spotify.getPlaylist(playlist)
            let songsList = fullList
                .filter(song => db.findSong(song.artists[0].name, this.stripSongName(song.name)))
                .map(song => ({
                    link: `https://open.spotify.com/track/${song.id}`,
                    previewUrl: song.preview_url,
                    title: this.stripSongName(song.name),
                    artist: (song.artists[0] || {}).name,
                    duration: song.duration_ms
				}))
			if (this.arguments.shuffle) {
				songsList = songsList.sort(() => Math.random() > 0.5 ? 1 : -1)
			}
			return songsList
        } catch (error) {
            this.textChannel.send('Could not retrieve the playlist. Make sure it\'s public')

            return null
        }
    }

    findSong(song: Song) {
        return db.findSong(song.artist, song.title)
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
