# GuessTheWord

GuessTheWord is a small browser-based vocabulary game for learning English words through active recall.

The first letter of each word is revealed automatically. Players enter complete guesses, and correct letters are uncovered progressively from left to right. Optional hints provide examples, definitions, translations, and additional letters at the cost of XP.

## Features

- English vocabulary with German translations
- Progressive letter guessing
- Hint system
- XP and streak tracking
- Learning summary after each word
- Background preloading of upcoming words
- Local caching with `localStorage`
- Responsive design
- Sound and haptic feedback
- No frameworks or build tools required

## Tech

Built with:

- HTML
- CSS
- Vanilla JavaScript
- Fetch API
- Local Storage

## Data & Credits

GuessTheWord uses public language resources and APIs for its vocabulary and learning content:

- [Google 10,000 English](https://github.com/first20hours/google-10000-english) — English word list
- [DictionaryAPI](https://dictionaryapi.dev/) — definitions and word types
- [Tatoeba](https://tatoeba.org/) — example sentences and translations
- [MyMemory](https://mymemory.translated.net/) — German word translations

Some ambiguous words are manually curated to provide more useful learning content.

Sound effects were sourced from [Freesound.org](https://freesound.org/) and are licensed under Creative Commons Zero (CC0).

## Running Locally

Clone the repository and run the project with a local web server.

For example:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Status

GuessTheWord is a small personal learning project and is still being improved, especially around vocabulary quality, translations, and example sentences.