#!/usr/bin/env node

require('dotenv').config();

const Koa = require('koa');
const serve = require('koa-static');
const websockify = require('koa-websocket');
const speech = require('@google-cloud/speech');

const app = websockify(new Koa());
const client = new_speech_client();

app.use(serve("client"));

app.ws.use(async cx => {
    const sampleRate = parseInt(cx.query.sampleRate);
    const request = {
        config: {
            encoding: 'LINEAR16',
            sampleRateHertz: sampleRate,
            languageCode: 'ja-JP',
            audio_channel_count: 1,
            enable_separate_recognition_per_channel: false,
            max_alternatives: 30,
            profanity_filter: true,
            speech_contexts: [],
            enable_word_time_offsets: true,
            enable_automatic_punctuation: true,
            diarization_config: {
                enable_speaker_diarization: true,
                min_speaker_count: 2,
                max_speaker_count: 6,
            },
            metadata: {
                interaction_type: 'DISCUSSION',
                //industry_naics_code_of_audio: '000000',
                microphone_distance: 'FARFIELD',
                original_media_type: 'AUDIO',
                recording_device_type: 'PC',
                //recording_device_name: 'PlayStation',
                //original_mime_type: '',
                audio_topic: '',
                model: 'default',
                //use_enhanced: false,
            },
        },
        single_utterance: false,
        interimResults: false,
    };

    const recognizer = client
        .streamingRecognize(request)
        .on('error', console.error)
        .on('data', m => {
            cx.websocket.send(JSON.stringify(m));
        });

    cx.websocket.on('message', msg => {
        recognizer.write(msg);
    });
    cx.websocket.on('close', () => {
        recognizer.end();
    });
});

function new_speech_client() {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return new speech.SpeechClient();
    } else if (process.env.GOOGLE_CREDENTIALS) {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        return new speech.SpeechClient({credentials});
    }
}

app.listen(process.env.PORT || 8080);
