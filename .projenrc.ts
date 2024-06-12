import { awscdk } from 'projen';
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'main',
  name: 'keycloak-split',
  projenrcTs: true,
  repository: 'https://github.com/3sky/cdk-ecs-keycloak.git',
  //  tsconfig: {
  //    include: ['bin/**/*.ts', 'lib/**/*.ts'],
  //    exclude: ['node_modules'],
  //  },
  keywords: [
    'ecs',
    'fargate',
    'keycloak',
  ],
  devDeps: [
    'aws-cdk',
    'ts-node',
  ],
  description: 'Setup keyclaok on ECS with Serverless Database',
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();
