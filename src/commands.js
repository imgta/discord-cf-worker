export const HELLO = { name: 'hello', description: 'Markov says hi.' };

export const CLEAR = { name: 'clear', description: 'Clears all channel messages.' };

export const ASK = {
    name: 'ask',
    description: 'Ask Markov a question',
    options: [{
        type: 3,
        name: 'question',
        description: 'You have questions, I have answers.',
        required: true,
    }],
};

export const ART = {
    name: 'art',
    description: 'Text-to-image generations',
    options: [{
        type: 3,
        name: 'image',
        description: 'Your texts into images.',
        required: true,
    }],
};

export const TLDR = {
    name: 'tldr',
    description: 'Have Markov generate a TLDR;',
    options: [{
        type: 3,
        name: 'text',
        description: `That long, dense Physics chapter on displacement? Don't worry, I'll get straight to the point!`,
        required: true,
    }],
};

export const FLUX = {
    name: 'flux',
    description: 'Text-to-image generations with FLUX.1',
    options: [{
        type: 3,
        name: 'prompt',
        description: 'FLUX.1 [schnell] by Black Forest Labs',
        required: true,
    }],
};
