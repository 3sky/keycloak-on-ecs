import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export interface ECSStackProps extends cdk.StackProps {
  dbCluster: rds.DatabaseCluster;
  sg: ec2.SecurityGroup;
  listener: elbv2.ApplicationListener;
  ecsCluster: ecs.Cluster;
}


export class ECSStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ECSStackProps) {
    super(scope, id, props);

    const theAurora = props.dbCluster;
    const theSG = props.sg;
    const theListner = props.listener;
    const theCluster = props.ecsCluster;

    cdk.Tags.of(this).add('description', 'Keycloak Demo');
    cdk.Tags.of(this).add('organization', '3sky.dev');
    cdk.Tags.of(this).add('owner', '3sky');

    let CUSTOM_IMAGE: string = 'quay.io/3sky/keycloak-aurora:latest';

    const ecsTaskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      memoryLimitMiB: 1024,
      cpu: 512,
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
      },

    });

    ecsTaskDefinition.addContainer('keycloak', {
      image: ecs.ContainerImage.fromRegistry(CUSTOM_IMAGE),
      environment: {
        KEYCLOAK_ADMIN: 'admin',
        KEYCLOAK_ADMIN_PASSWORD: 'admin',
        KC_DB: 'postgres',
        KC_DB_URL: 'jdbc:aws-wrapper:postgresql://' + theAurora.clusterEndpoint.hostname + ':5432/keycloak',
        C_DB_USERNAME: 'keycloak',
        KC_DB_PASSWORD: 'password',
        KC_HOSTNAME_STRICT: 'false',
        KC_HTTP_ENABLED: 'true',
        KC_DB_DRIVER: 'software.amazon.jdbc.Driver',
        KC_HOSTNAME: 'sso.3sky.in',
        KC_LOG_LEVEL: 'DEBUG',
      },
      portMappings: [
        {
          containerPort: 8080,
          protocol: ecs.Protocol.TCP,
        },
      ],
      logging: new ecs.AwsLogDriver({ streamPrefix: 'keycloak' }),
      command: ['start', '--optimized'],
    });

    const ecsService = new ecs.FargateService(this, 'EcsService', {
      cluster: theCluster,
      taskDefinition: ecsTaskDefinition,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [
        theSG,
      ],
    });

    ecsService.registerLoadBalancerTargets(
      {
        containerName: 'keycloak',
        containerPort: 8080,
        newTargetGroupId: 'ECS',
        listener:
          ecs.ListenerConfig.applicationListener(theListner, {
            protocol: elbv2.ApplicationProtocol.HTTP,
          }),
      },
    );


  }
}
