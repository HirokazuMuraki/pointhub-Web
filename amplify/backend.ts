import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { getShopservePoints } from './functions/get-shopserve-points/resource';
import { operateShopservePoints } from './functions/operate-shopserve-points/resource';
import { issueGifteeTicket } from './functions/issue-giftee-ticket/resource';
import { sendOrderNotification } from './functions/send-order-notification/resource';
import { sendShipmentNotification } from './functions/send-shipment-notification/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  getShopservePoints,
  operateShopservePoints,
  issueGifteeTicket,
  sendOrderNotification,
  sendShipmentNotification,
});

const issueGifteeTicketLambda = backend.issueGifteeTicket.resources.lambda;
const sendOrderNotificationLambda = backend.sendOrderNotification.resources.lambda;
const sendShipmentNotificationLambda = backend.sendShipmentNotification.resources.lambda;

// SES権限 (共通)
const sesPolicy = new PolicyStatement({
  actions: ["ses:SendEmail", "ses:SendRawEmail"],
  resources: ["*"],
});

issueGifteeTicketLambda.addToRolePolicy(sesPolicy);
sendOrderNotificationLambda.addToRolePolicy(sesPolicy);
sendShipmentNotificationLambda.addToRolePolicy(sesPolicy);

// DynamoDB権限（既存のGiftee用）
issueGifteeTicketLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["dynamodb:GetItem", "dynamodb:Query"],
    resources: ["*"],
  })
);
