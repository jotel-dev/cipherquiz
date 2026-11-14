import { CATEGORIES, type Category } from '@cipherquiz/shared';

export interface PracticeQuestion {
  id: string;
  prompt: string;
  choices: readonly [string, string, string, string];
  answer: number;
}
// Public, intentionally non-confidential practice fixtures. Never use this bank for onchain rounds.
const question = (
  id: string,
  prompt: string,
  choices: PracticeQuestion['choices'],
  answer: number,
): PracticeQuestion => ({ id, prompt, choices, answer });
export const QUESTIONS: Record<Category, readonly PracticeQuestion[]> = {
  Mathematics: [
    question(
      'm1',
      'What is the only even prime number?',
      ['0', '1', '2', '4'],
      2,
    ),
    question(
      'm2',
      'What is the square root of 144?',
      ['10', '11', '12', '14'],
      2,
    ),
    question(
      'm3',
      'How many degrees are in a triangle?',
      ['90', '180', '270', '360'],
      1,
    ),
    question('m4', 'What is 15% of 200?', ['15', '20', '30', '35'], 2),
    question(
      'm5',
      'Which number comes next: 2, 4, 8, 16, …?',
      ['20', '24', '30', '32'],
      3,
    ),
    question(
      'm6',
      'What is the value of 7 squared?',
      ['14', '21', '49', '77'],
      2,
    ),
    question('m7', 'A hexagon has how many sides?', ['5', '6', '7', '8'], 1),
    question(
      'm8',
      'What is 3/4 expressed as a decimal?',
      ['0.25', '0.34', '0.5', '0.75'],
      3,
    ),
    question(
      'm9',
      'What is the next prime after 7?',
      ['8', '9', '10', '11'],
      3,
    ),
    question(
      'm10',
      'What is the sum of the angles in a square?',
      ['90°', '180°', '270°', '360°'],
      3,
    ),
  ],
  Geography: [
    question(
      'g1',
      'Which country is home to the ancient city of Petra?',
      ['Egypt', 'Jordan', 'Greece', 'Türkiye'],
      1,
    ),
    question(
      'g2',
      'Which is the largest ocean on Earth?',
      ['Atlantic', 'Indian', 'Pacific', 'Arctic'],
      2,
    ),
    question(
      'g3',
      'What is the capital of Japan?',
      ['Kyoto', 'Osaka', 'Tokyo', 'Seoul'],
      2,
    ),
    question(
      'g4',
      'The Andes mountains run along which continent?',
      ['Africa', 'Europe', 'Asia', 'South America'],
      3,
    ),
    question(
      'g5',
      'Which country has the most land area?',
      ['Canada', 'Russia', 'China', 'Brazil'],
      1,
    ),
    question(
      'g6',
      'Mount Kilimanjaro is in which country?',
      ['Kenya', 'Tanzania', 'Uganda', 'Ethiopia'],
      1,
    ),
    question(
      'g7',
      'Which river flows through Paris?',
      ['Thames', 'Rhine', 'Seine', 'Danube'],
      2,
    ),
    question(
      'g8',
      'Which of these countries is landlocked?',
      ['Chile', 'Portugal', 'Nepal', 'Vietnam'],
      2,
    ),
    question(
      'g9',
      'Which is the smallest continent by land area?',
      ['Europe', 'Australia', 'Antarctica', 'South America'],
      1,
    ),
    question(
      'g10',
      'What is the capital of Nigeria?',
      ['Lagos', 'Kano', 'Ibadan', 'Abuja'],
      3,
    ),
  ],
  History: [
    question(
      'h1',
      'In which year did humans first land on the Moon?',
      ['1959', '1965', '1969', '1972'],
      2,
    ),
    question(
      'h2',
      'Which civilization built the pyramids at Giza?',
      ['Roman', 'Egyptian', 'Mayan', 'Persian'],
      1,
    ),
    question(
      'h3',
      'The Renaissance began in which country?',
      ['France', 'Germany', 'Italy', 'Spain'],
      2,
    ),
    question(
      'h4',
      'Who was the first president of the United States?',
      [
        'John Adams',
        'Thomas Jefferson',
        'Abraham Lincoln',
        'George Washington',
      ],
      3,
    ),
    question(
      'h5',
      'In which year did the Berlin Wall fall?',
      ['1985', '1989', '1991', '1994'],
      1,
    ),
    question(
      'h6',
      'Which empire built the Colosseum?',
      ['Ottoman', 'Roman', 'Byzantine', 'Mongol'],
      1,
    ),
    question(
      'h7',
      'Who developed the first successful polio vaccine?',
      ['Alexander Fleming', 'Louis Pasteur', 'Jonas Salk', 'Edward Jenner'],
      2,
    ),
    question(
      'h8',
      'Magna Carta was first issued in which year?',
      ['1066', '1215', '1492', '1776'],
      1,
    ),
    question(
      'h9',
      'Which ancient city was buried by Mount Vesuvius?',
      ['Athens', 'Troy', 'Pompeii', 'Carthage'],
      2,
    ),
    question(
      'h10',
      'Nigeria gained independence in which year?',
      ['1957', '1960', '1963', '1966'],
      1,
    ),
  ],
  'General Knowledge': [
    question(
      'k1',
      'Which element has the chemical symbol Au?',
      ['Silver', 'Argon', 'Gold', 'Aluminium'],
      2,
    ),
    question(
      'k2',
      'How many hearts does an octopus have?',
      ['1', '2', '3', '4'],
      2,
    ),
    question(
      'k3',
      'Who wrote “Things Fall Apart”?',
      ['Wole Soyinka', 'Chinua Achebe', 'Chimamanda Adichie', 'Ben Okri'],
      1,
    ),
    question(
      'k4',
      'Which planet is known as the Red Planet?',
      ['Venus', 'Mars', 'Jupiter', 'Saturn'],
      1,
    ),
    question(
      'k5',
      'What is the hardest natural mineral?',
      ['Quartz', 'Ruby', 'Diamond', 'Topaz'],
      2,
    ),
    question(
      'k6',
      'Which instrument has 88 keys?',
      ['Violin', 'Trumpet', 'Flute', 'Piano'],
      3,
    ),
    question(
      'k7',
      'How many players are on a football team on the pitch?',
      ['9', '10', '11', '12'],
      2,
    ),
    question(
      'k8',
      'Which gas do plants absorb during photosynthesis?',
      ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
      2,
    ),
    question(
      'k9',
      'What is the largest organ of the human body?',
      ['Liver', 'Skin', 'Lungs', 'Brain'],
      1,
    ),
    question(
      'k10',
      'What does the “H” in H₂O stand for?',
      ['Helium', 'Hydrogen', 'Hafnium', 'Holmium'],
      1,
    ),
  ],
};

export const CATEGORY_DETAILS = Object.fromEntries(
  CATEGORIES.map((name, index) => [
    name,
    {
      description: [
        'Find your rhythm in numbers, logic and the beautifully precise.',
        'From familiar places to the world’s best-kept corners.',
        'Big ideas, turning points and the people who changed everything.',
        'A little science. A little culture. A whole lot of curiosity.',
      ][index],
      short: [
        'Numbers meet intuition.',
        'Your world. Rediscovered.',
        'The past has good questions.',
        'Stay endlessly curious.',
      ][index],
      label: [
        'THE LOGICAL MIND',
        'THE WORLD EXPLORER',
        'THE TIME TRAVELLER',
        'THE ALL-ROUNDER',
      ][index],
    },
  ]),
) as Record<Category, { description: string; short: string; label: string }>;
