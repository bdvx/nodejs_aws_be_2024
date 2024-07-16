import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';

const generatePolicy = (principalId: string, effect: 'Allow' | 'Deny', resource: string, statusCode?: string, message?: string): APIGatewayAuthorizerResult => {
  console.log(`Generating policy for principalId: ${principalId}, effect: ${effect}, resource: ${resource}`);

  const policyDocument = {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      },
    ],
  };

  const response: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument,
  };

  if (statusCode) {
    response.context = {
      statusCode,
      message,
    };
  }

  console.log(`Policy generated: ${JSON.stringify(response)}`);
  return response;
};

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  console.log('Received event:', JSON.stringify(event));

  if (!event.authorizationToken) {
    console.log('No authorization token found');
    return generatePolicy('user', 'Deny', event.methodArn, '401', 'Unauthorized');
  }

  const authToken = event.authorizationToken.split(' ')[1];
  const [username, password] = Buffer.from(authToken, 'base64').toString('utf-8').split(':');

  console.log(`Decoded username: ${username}:${password}`);

  const storedPassword = process.env[username];

  console.log(`Decoded username: ${username}:${password}:${storedPassword}`);

  if (storedPassword && Buffer.from(authToken, 'base64').toString('utf-8') === `${username}:${storedPassword}`) {
    console.log(`User authorized: ${username}`);
    return generatePolicy(username, 'Allow', event.methodArn);
  } else {
    console.log(`User not authorized: ${username}`);
    return generatePolicy(username, 'Deny', event.methodArn, '403', 'Forbidden');
  }
};
