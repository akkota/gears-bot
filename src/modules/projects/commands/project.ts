import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import {
  paginateProjects,
  searchEswProjects,
} from "../services/projectSearchService.js";
import { buildProjectSearchMessage } from "../services/projectSearchUi.js";

export const projectCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("project")
    .setDescription("Search ESW chapter projects from the Plan.io database.")
    .addSubcommand((sub) =>
      sub
        .setName("search")
        .setDescription("Search projects by keyword, name, or topic.")
        .addStringOption((option) =>
          option
            .setName("query")
            .setDescription("Project name, topic, or keyword (for example hydroponics).")
            .setRequired(true)
            .setMaxLength(80),
        )
        .addStringOption((option) =>
          option
            .setName("chapter")
            .setDescription("Optional school/chapter name filter.")
            .setRequired(false)
            .setMaxLength(80),
        ),
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const query = interaction.options.getString("query", true).trim();
    const chapter = interaction.options.getString("chapter", false)?.trim() || null;

    if (!query) {
      await interaction.editReply({
        content: "Provide a search query such as a project name or topic.",
      });
      return;
    }

    let results;
    try {
      results = await searchEswProjects({ query, chapter });
    } catch (error) {
      console.error("Project search failed:", error);
      await interaction.editReply({
        content:
          "Could not search the ESW project database right now. Please try again in a moment.",
      });
      return;
    }

    const page = paginateProjects(results, 0);
    const message = buildProjectSearchMessage(page.items, page.page, page.total, page.totalPages, {
      query,
      chapter,
    });

    await interaction.editReply({
      embeds: message.embeds,
      components: message.components,
    });
  },
};
