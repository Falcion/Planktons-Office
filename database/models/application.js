import { INTEGER, Model, TEXT } from "sequelize";

module.exports = (seq, data_type) => {
    class Query extends Model {}

    Query.init({
        ID: {
            type: INTEGER,
            'autoIncrement': true,
            'primaryKey': true,
            'allowNull': false,
        },
        ADMINS_CHANNEL_MESSAGE_ID: {
            type: TEXT,
            'allowNull': true,
        },
        PUBLIC_CHANNEL_MESSAGE_ID: {
            type: TEXT,
            'allowNull': true,
        },
        PUBLIC_CHANNEL_CONTEXT_ID: {
            type: TEXT,
            'allowNull': true,
        },
        TICKET_CHANNEL_ID: {
            type: TEXT,
            'allowNull': true,
        },
        TICKET_CONTEXT_ID: {
            type: TEXT,
            'allowNull': false,
            'unique': true,
        },
        TICKET_AUTHORS_ID: {
            type: TEXT,
            'allowNull': true,
        },
        IS_ACCEPTED: {
            type: INTEGER,
            'allowNull': false,
        },
        IS_REVIEWED: {
            type: INTEGER,
            'allowNull': false,
        },
    });
}