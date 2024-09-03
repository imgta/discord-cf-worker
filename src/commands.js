export const STATUS = {
    name: 'status',
    description: 'Give me your status.',
    options: [{
        type: 3,
        name: 'report',
        description: 'Type of status report.',
    }]
};

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
