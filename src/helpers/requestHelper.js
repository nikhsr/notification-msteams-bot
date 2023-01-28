
const MicrosoftGraph= require('@microsoft/microsoft-graph-client');

module.exports = class SubscriptionManagementService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.subscriptionPath = '/subscriptions';
  }

  getGraphClient() {
    const client = MicrosoftGraph.Client.init({
      authProvider: (done) => {
        done(null, this.accessToken);
      }
    });
    return client;
  }

  async deleteSubscription(subscriptionId) {
    const client = this.getGraphClient();
    await client.api(`${this.subscriptionPath}/${subscriptionId}`).delete();
  }

  async createSubscription(subscriptionCreationInformation) {
    const client = this.getGraphClient();
    const subscription = await client.api(this.subscriptionPath).version('beta').create(subscriptionCreationInformation);
    return subscription;
  }

  async getData(path) {
    const client = this.getGraphClient();
    const result = await client.api(path).headers({
      'Content-Type': 'application/json',
      Accept: 'application/json;odata.metadata=minimal;'
                + 'odata.streaming=true;IEEE754Compatible=false'
    }).get();
    return result;
  }
}
