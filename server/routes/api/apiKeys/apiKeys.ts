import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { ApiKey } from "@server/models";
import { authorize } from "@server/policies";
import { presentApiKey } from "@server/presenters";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "apiKeys.create",
  auth({ member: true }),
  validate(T.APIKeysCreateSchema),
  transaction(),
  async (ctx: APIContext<T.APIKeysCreateReq>) => {
    const { name } = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "createApiKey", user.team);

    const apiKey = await ApiKey.create(
      {
        name,
        userId: user.id,
      },
      ctx.context
    );

    ctx.body = {
      data: presentApiKey(apiKey),
    };
  }
);

router.post(
  "apiKeys.list",
  auth({ member: true }),
  pagination(),
  async (ctx: APIContext) => {
    const { user } = ctx.state.auth;
    const apiKeys = await ApiKey.findAll({
      where: {
        userId: user.id,
      },
      order: [["createdAt", "DESC"]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    ctx.body = {
      pagination: ctx.state.pagination,
      data: apiKeys.map(presentApiKey),
    };
  }
);

router.post(
  "apiKeys.delete",
  auth({ member: true }),
  validate(T.APIKeysDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.APIKeysDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const apiKey = await ApiKey.findByPk(id, {
      rejectOnEmpty: true,
      lock: transaction.LOCK.UPDATE,
      ...ctx.context,
    });
    authorize(user, "delete", apiKey);

    await apiKey.destroy(ctx.context);

    ctx.body = {
      success: true,
    };
  }
);

export default router;
