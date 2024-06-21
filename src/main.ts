#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ECSStack } from './ecs-stack';
import { KeycloakSplitStack } from './keycloak-split-stack';

const app = new cdk.App();
const main = new KeycloakSplitStack(app, 'KeycloakSplitStack', {
  env: {
    region: process.env.AWS_REGION,
    account: process.env.AWS_ACCOUNT,
  },
});

new ECSStack(app, 'ECSStack', {
  env: {
    region: process.env.AWS_REGION,
    account: process.env.AWS_ACCOUNT,
  },
  dbCluster: main.auroraCluster,
  sg: main.privateSecurityGroup,
  listener: main.listener,
  ecsCluster: main.ecsCluster,
  secret: main.templatedSecret,
});
