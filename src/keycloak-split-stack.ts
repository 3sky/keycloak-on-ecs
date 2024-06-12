import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';

import { Construct } from 'constructs';

export class KeycloakSplitStack extends cdk.Stack {
  public readonly auroraCluster: rds.DatabaseCluster;
  public readonly privateSecurityGroup: ec2.SecurityGroup;
  public readonly listener: elbv2.ApplicationListener;
  public readonly ecsCluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add('description', 'Keycloak Demo');
    cdk.Tags.of(this).add('organization', '3sky.dev');
    cdk.Tags.of(this).add('owner', '3sky');


    const vpc = new ec2.Vpc(this, 'VPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.192.0.0/20'),
      maxAzs: 2,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      restrictDefaultSecurityGroup: true,
      subnetConfiguration: [
        {
          cidrMask: 28,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 28,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    const albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
      vpc: vpc,
      description: 'Allow HTTP traffic to ALB',
      allowAllOutbound: true,
    });
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic from anywhere');

    this.privateSecurityGroup = new ec2.SecurityGroup(this, 'PrivateSG', {
      vpc: vpc,
      description: 'Allow access from private network',
      allowAllOutbound: true,
    });

    this.privateSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(8080), 'Allow traffic from ALB to Fargate');


    const auroraSecurityGroup = new ec2.SecurityGroup(this, 'AuroraSG', {
      vpc: vpc,
      description: 'Allow access to MySQL from private network',
    });

    auroraSecurityGroup.addIngressRule(
      this.privateSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow MySQL access from private network',
    );

    const alb = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLB', {
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      internetFacing: true,
      securityGroup: albSecurityGroup,
    });

    this.listener = alb.addListener('Listener', {
      port: 80,
      open: true,
    });


    this.auroraCluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      vpc: vpc,
      defaultDatabaseName: 'keycloak',
      credentials: {
        username: 'keycloak',
        // WARNING: This is wrong, do not work this way
        password: cdk.SecretValue.unsafePlainText('password'),
      },
      // NOTE: use this rather for testing
      deletionProtection: false,
      securityGroups: [
        auroraSecurityGroup,
      ],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_1,
      }),
      writer: rds.ClusterInstance.serverlessV2('ClusterInstance', {
        scaleWithWriter: true,
      }),
    });


    this.ecsCluster = new ecs.Cluster(this, 'EcsCluster', {
      clusterName: 'keycloak-ecs-cluster',
      containerInsights: true,
      enableFargateCapacityProviders: true,
      vpc: vpc,
    });
  }
}
