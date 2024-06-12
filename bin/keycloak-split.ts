#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KeycloakSplitStack } from '../lib/keycloak-split-stack';
import { ECSStack } from '../lib/ecs-stack';

const app = new cdk.App();
const main = new KeycloakSplitStack(app, 'KeycloakSplitStack', {});

new ECSStack(app, 'ECSStack', {

  dbCluster: main.auroraCluster,
  sg: main.privateSecurityGroup,
  listener: main.listener,
  ecsCluster: main.ecsCluster,
});
