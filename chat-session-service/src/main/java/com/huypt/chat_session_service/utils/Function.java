package com.huypt.chat_session_service.utils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Function {
    public static String convertMarkdownToVoice(String markdown) {
        if (markdown == null || markdown.isBlank()) {
            return "";
        }

        String text = markdown;

        // Convert markdown table
        Pattern tablePattern = Pattern.compile("((?:\\|.*\\|\\n?)+)");
        Matcher matcher = tablePattern.matcher(text);

        StringBuffer buffer = new StringBuffer();

        while (matcher.find()) {
            String table = matcher.group(1);
            matcher.appendReplacement(
                    buffer,
                    Matcher.quoteReplacement(convertTableToVoice(table))
            );
        }

        matcher.appendTail(buffer);
        text = buffer.toString();


        // Remove code block
        text = text.replaceAll("```[\\s\\S]*?```", " ");


        // Remove bold / italic
        text = text.replaceAll("\\*\\*(.*?)\\*\\*", "$1");
        text = text.replaceAll("\\*(.*?)\\*", "$1");
        text = text.replaceAll("__(.*?)__", "$1");
        text = text.replaceAll("_(.*?)_", "$1");


        // Remove heading
        text = text.replaceAll("(?m)^#{1,6}\\s*", "");


        // Remove markdown list symbol
        text = text.replaceAll("(?m)^\\s*[-*+]\\s+", "");


        // Convert markdown link
        text = text.replaceAll("\\[([^\\]]+)\\]\\([^)]*\\)", "$1");


        // Remove remaining markdown characters
        text = text.replaceAll("[`>#]", "");


        // Normalize text
        text = text.replaceAll("\\n+", ". ");
        text = text.replaceAll("\\s+", " ");

        return text.trim();
    }


    private static String convertTableToVoice(String table) {

        List<String[]> rows = new ArrayList<>();

        for (String line : table.split("\\n")) {

            if (!line.contains("|")) {
                continue;
            }

            String[] cells = Arrays.stream(line.split("\\|"))
                    .map(String::trim)
                    .filter(cell -> !cell.isEmpty())
                    .toArray(String[]::new);

            if (cells.length > 0) {
                rows.add(cells);
            }
        }


        if (rows.size() < 2) {
            return table;
        }


        // Remove separator row:
        // |-----|-----|
        rows.removeIf(row ->
                Arrays.stream(row)
                        .allMatch(cell -> cell.matches("[-:\\s]+"))
        );

        if (rows.size() < 2) {
            return "";
        }

        String[] headers = rows.get(0);

        List<String> result = new ArrayList<>();

        for (int i = 1; i < rows.size(); i++) {

            String[] row = rows.get(i);

            List<String> sentence = new ArrayList<>();

            for (int j = 0; j < headers.length && j < row.length; j++) {

                sentence.add(
                        headers[j] + " " + row[j]
                );
            }

            result.add(String.join(", ", sentence));
        }


        return String.join(". ", result);
    }
}
