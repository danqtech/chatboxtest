export interface ChatState {
  country: string;
  continent: string;
  destination: string;
  onboardingComplete: boolean;
  currentQuestion: number;
}

export interface CommandResult {
  isCommand: boolean;
  command?: 'change-destination' | 'change-continent' | 'change-country';
  response?: string;
  helpText?: string;
}

const commands = {
  '/change-destination': {
    command: 'change-destination' as const,
    response: 'What is your new favorite destination?',
    helpText: 'Change your favorite destination'
  },
  '/change-continent': {
    command: 'change-continent' as const,
    response: 'What is your new favorite continent?',
    helpText: 'Change your favorite continent'
  },
  '/change-country': {
    command: 'change-country' as const,
    response: 'What is your new favorite country?',
    helpText: 'Change your favorite country'
  }
} as const;

export function parseCommand(input: string): CommandResult {
  const trimmed = input.trim();
  
  if (trimmed in commands) {
    const cmd = commands[trimmed as keyof typeof commands];
    return {
      isCommand: true,
      command: cmd.command,
      response: cmd.response
    };
  }
  
  return { isCommand: false };
}

export function getCommandHelp(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed in commands) {
    return commands[trimmed as keyof typeof commands].helpText;
  }
  return null;
}

export function getCommandSuggestions(input: string): string[] {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed.startsWith('/')) return [];
  
  return Object.keys(commands).filter(cmd => 
    cmd.toLowerCase().startsWith(trimmed)
  );
}

export function updateChatState(chatState: ChatState, command: string, value: string): ChatState {
  switch (command) {
    case 'change-destination':
      return { ...chatState, destination: value };
    case 'change-continent':
      return { ...chatState, continent: value };
    case 'change-country':
      return { ...chatState, country: value };
    default:
      return chatState;
  }
}