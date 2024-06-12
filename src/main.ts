#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ECSStack } from './ecs-stack';
import { KeycloakSplitStack } from './keycloak-split-stack';

const app = new cdk.App();
const main = new KeycloakSplitStack(app, 'KeycloakSplitStack', {});

new ECSStack(app, 'ECSStack', {

  dbCluster: main.auroraCluster,
  sg: main.privateSecurityGroup,
  listener: main.listener,
  ecsCluster: main.ecsCluster,
});
