export const SNSClient = jest.fn(() => ({
  send: jest.fn(),
}));

export const PublishCommand = jest.fn();
