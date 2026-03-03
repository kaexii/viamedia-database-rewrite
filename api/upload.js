import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  try {
    // CREATE
    if (req.method === "POST") {
      const newObject = req.body;

      if (!newObject || typeof newObject !== "object") {
        return res.status(400).json({ error: "Invalid JSON body" });
      }

      const id = await redis.incr("myArray:id");

      const objectWithId = {
        id,
        ...newObject,
      };

      // store object separately
      await redis.set(`myArray:item:${id}`, objectWithId);

      // store ID in list
      await redis.rpush("myArray:ids", id);

      return res.status(200).json(objectWithId);
    }

    // FETCH ALL
    if (req.method === "GET") {
      const ids = await redis.lrange("myArray:ids", 0, -1);

      const items = await Promise.all(
        ids.map(id => redis.get(`myArray:item:${id}`))
      );

      return res.status(200).json(items.filter(Boolean));
    }

    // DELETE
    if (req.method === "DELETE") {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: "ID required" });
      }

      // delete the object
      await redis.del(`myArray:item:${id}`);

      // remove id from list
      await redis.lrem("myArray:ids", 0, Number(id));

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
