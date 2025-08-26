import { Sequelize } from "sequelize";

export async function generatePaymentCode(db) {
	const { Sequence } = db.ecommerce.models;
	const sequelize = db.ecommerce.sequelize;

	const today = new Date();
	const year = today.getFullYear().toString().slice(-2);
	const month = (today.getMonth() + 1).toString().padStart(2, "0");
	const day = today.getDate().toString().padStart(2, "0");
	const dateStr = `${year}${month}${day}`;

	let nextValue;

	await sequelize.transaction(
		{
			isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
		},
		async (t) => {
			const sequence = await Sequence.findOne({
				where: { date: dateStr },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});

			if (sequence) {
				sequence.value += 1;
				await sequence.save({ transaction: t });
				nextValue = sequence.value;
			} else {
				await Sequence.create(
					{ date: dateStr, value: 1 },
					{ transaction: t }
				);
				nextValue = 1;
			}
		}
	);

	const paddedValue = nextValue.toString().padStart(7, "0");
	return `PD-${dateStr}-${paddedValue}`;
}
