
const { Op } = require("sequelize");

const EODService = async (db) => {
  console.log("Running EOD service...");
  for (const tenant in db) {
    const expiredSubscriptions = await db[tenant].models.Subscription.findAll({
      where: {
        endDate: {
          [Op.lt]: new Date(),
        },
      },
    });

    if (expiredSubscriptions.length > 0) {
      console.log(`Found ${expiredSubscriptions.length} expired subscriptions for tenant ${tenant}.`);
      await db[tenant].models.Subscription.destroy({
        where: {
          id: expiredSubscriptions.map((s) => s.id),
        },
      });
      console.log(`Expired subscriptions removed for tenant ${tenant}.`);
    }
  }
};

module.exports = EODService;
