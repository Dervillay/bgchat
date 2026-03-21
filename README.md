<div align="center">
    <img src="https://i.ibb.co/XTgVg4V/BGChat.png" alt="BGChat Logo" width="150">
    <h1>BGChat</h1>
    <h4>AI board game rules lawyer with citations and rulebook previews.
    <br/>
    <a href="https://bg-chat.com">Try it out here.</a></h4>
    <a href="https://ko-fi.com/dervillay">
        <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support BGChat on Ko-fi" />
    </a>
</div>

## Overview

BGChat saves you time flicking through board game rulebooks when you want to look up rules and settle disputes, citing relevant passages with helpful previews of the rulebook pages where they appear.

### Features

- **Semantic Search**: Finds relevant rulebook sections using embeddings
- **AI-Powered Q&A**: Uses AI to answer questions using these sections
- **Rulebook PDFs**: Cites and shows pages of rulebooks used to inform the answer
- **Board Game Geek Integration**: Searches and finds answers on the BGG forum when rulebooks aren't clear
- **User Authentication**: Auth0 integration for secure user account management and authentication
- **User Settings**: Saves each user's chat history, token usage and settings between sessions
- **Usage Limits**: Handles setting daily token usage limits

## Developer setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.12+
- MongoDB Atlas account
- Auth0 account
- OpenAI API key

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/Dervillay/BGChat.git
cd BGChat
```

2. **Backend setup**
```bash
cd backend
python3 -m venv myenv
source myenv/bin/activate  # On Windows: myenv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env.development
# Update .env.development with your actual values
```

3. **Frontend setup**
```bash
cd frontend
npm install
cp .env.example .env.development
# Update .env.development with your actual values
```

4. **Start development servers**
```bash
./start-dev.sh
```

## Feedback / Issues
- To request new board games or features, please submit them through the [BGChat app](https://bg-chat.com)
- For issues and bug reports, please file a [GitHub issue](https://github.com/Dervillay/BGChat/issues)

## Contributing

Contributions are welcome! Just make a PR and I'll take a look when I get chance.

## Support the project

If BGChat has ever helped you settle board game disputes, consider supporting its development.
BGChat is free to use for everyone, and your support helps to keep it that way.

All donations above the amount required to host BGChat (~7 GBP per month) go to [high impact charities](https://www.farmkind.giving/) that make animals less sad.

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/dervillay)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.