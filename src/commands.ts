import { MusicQuiz } from './music-quiz';
import { PlayPlaylist } from './play-playlist';
import { Calibration } from './calibrate';
import { QuizArgs } from './types/quiz-args';
import { PlayArgs } from './types/play-args';
import { Command, CommandoClient, CommandoMessage } from "discord.js-commando"
import { Message } from "discord.js"
import { CalibrateArgs } from 'calibrate-args';

export class MusicQuizCommand extends Command {
    constructor(client: CommandoClient) {
        super(client, {
            name: 'music-quiz',
            memberName: 'music-quizzer',
            group: 'music',
            description: 'Music Quiz from Spotify playlists',
            guildOnly: true,
            throttling: {usages: 1, duration: 10},
            args: [
                {
                    key: 'playlist',
                    prompt: 'Which playlist to play songs from',
                    type: 'string',
                },
                {
                    key: 'songs',
                    prompt: 'How many songs the quiz will contain',
                    type: 'string',
                    default: 10
                },
                {
                    key: 'duration',
                    prompt: 'How long each song will last',
                    type: 'string',
                    default: 60
                },
                {
                    key: 'only',
                    prompt: 'Only this answer is required; artist, title or both',
                    type: 'string',
                    oneOf: ['artist', 'title', 'both'],
                    default: 'both'
                }
            ]
        })
    }

    async run(message: CommandoMessage, args: QuizArgs, fromPattern: boolean): Promise<Message | Message[]> {
        if (message.guild.quiz) {
            return message.say('Quiz is already running')
        }

        if (message.member.voice.channel === null) {
            return message.say('Please join a voice channel and try again')
        }

        message.guild.quiz = new MusicQuiz(message, args)

        try {
            message.guild.quiz.start()
        } catch (e) {
            console.log("Process ded");
        }
    }
}

export class PlayPlaylistCommand extends Command {
    constructor(client: CommandoClient) {
        super(client, {
            name: 'play-playlist',
            memberName: 'play-playlist',
            group: 'music',
            description: 'Play Spotify playlists',
            guildOnly: true,
            throttling: {usages: 1, duration: 10},
            args: [
                {
                    key: 'playlist',
                    prompt: 'Which playlist to play songs from',
                    type: 'string',
                },
                {
                    key: 'shuffle',
                    prompt: 'Shuffle the playlist',
                    type: 'boolean',
                    default: false
                }
            ]
        })
    }

    async run(message: CommandoMessage, args: PlayArgs, fromPattern: boolean): Promise<Message | Message[]> {
        if (message.guild.play) {
            return message.say('Playlist is already running')
        }

        if (message.member.voice.channel === null) {
            return message.say('Please join a voice channel and try again')
        }

        message.guild.play = new PlayPlaylist(message, args)

        try {
            message.guild.play.start()
        } catch (e) {
            console.log("Process ded");
        }
    }
}

export class CalibratePlaylistCommand extends Command {
    constructor(client: CommandoClient) {
        super(client, {
            name: 'calibrate',
            memberName: 'calibrate',
            group: 'music',
            description: 'Calibrate Spotify playlists',
            guildOnly: true,
            throttling: {usages: 1, duration: 10},
            args: [
                {
                    key: 'playlist',
                    prompt: 'Which playlist to calibrate songs from',
                    type: 'string',
                },
                {
                    key: 'skip',
                    prompt: 'Skip to uncalibrated songs',
                    type: 'boolean',
                    default: true
                }
            ]
        })
    }

    async run(message: CommandoMessage, args: CalibrateArgs, fromPattern: boolean): Promise<Message | Message[]> {
        if (message.guild.calibration) {
            return message.say('Calibration is already running')
        }

        message.guild.calibration = new Calibration(message, args)

        try {
            message.guild.calibration.start()
        } catch (e) {
            console.log("Process ded");
        }
    }
}
