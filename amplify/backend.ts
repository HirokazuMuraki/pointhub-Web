import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { getShopservePoints } from './functions/get-shopserve-points/resource';
import { operateShopservePoints } from './functions/operate-shopserve-points/resource';
import { issueGifteeTicket } from './functions/issue-giftee-ticket/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  getShopservePoints,
  operateShopservePoints,
  issueGifteeTicket,
});

const issueGifteeTicketLambda = backend.issueGifteeTicket.resources.lambda;

// SES権限
issueGifteeTicketLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: ["*"],
  })
);

// DynamoDB権限（全てのテーブルへの読み取りを一旦許可して疎通確認）
issueGifteeTicketLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["dynamodb:GetItem", "dynamodb:Query"],
    resources: ["*"],
  })
);
