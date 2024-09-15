export const HELLO = { name: 'hello', description: 'Markov says hi.' };

export const ASK = {
    name: 'ask',
    description: 'Ask Markov a question.',
    options: [{
        type: 3, 
        name: 'question', 
        description: 'You have questions, I have answers.', 
        required: true,
    }],
};

export const ART = {
    name: 'art',
    description: 'Text-to-image generations.',
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
