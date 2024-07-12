import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent, StatementEffect } from 'aws-lambda';

const generatePolicy = (principalId: string, effect: StatementEffect, resource: string): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
};

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  if (!event.authorizationToken) {
    throw new Error('Unauthorized');
  }

  const authToken = event.authorizationToken.split(' ')[1];
  const [username, password] = Buffer.from(authToken, 'base64').toString('utf-8').split(':');

  const storedPassword = process.env[username];

  if (storedPassword && storedPassword === password) {
    return generatePolicy(username, 'Allow', event.methodArn);
  } else {
    throw new Error('Unauthorized');
  }
};