
import { Router } from "express";
import { elasticClient, INDEX_NAME } from "../config/elasticsearch";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Please enter a search term.",
      });
    }

    const result = await elasticClient.search({
      index: INDEX_NAME,
      query: {
        multi_match: {
          query: q,
          fields: ["recipient_email", "subject", "body"],
          fuzziness: "AUTO",
        },
      },
    });

    const emails = result.hits.hits.map((hit) => hit._source);

    return res.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error("Email search error:", error);

    return res.status(500).json({
      success: false,
      message: "Email search failed.",
    });
  }
});

export default router;
