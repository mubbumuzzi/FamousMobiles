package com.famousmobiles.config;

import java.util.List;

/** Shop branding shown on receipts and customer-facing pages. */
public final class ShopInfo {

    public static final String NAME = "Famous Mobiles";
    public static final String OWNER_NAME = "Basheer Uddin";
    public static final String MOBILE = "9063786751";
    public static final List<String> ADDRESS_LINES = List.of(
            "Opp Friends Colony Bus Stop",
            "Shaikpet Main Road, Manikonda",
            "Hyderabad");
    public static final List<String> TERMS = List.of(
            "Delivery should be collected within 2 months; otherwise we are not responsible.",
            "Please bring this bill when collecting your device.");

    private ShopInfo() {}

    public static Resolved resolve(AppProperties.Shop shop) {
        return new Resolved(
                value(shop != null ? shop.name() : null, NAME),
                value(shop != null ? shop.ownerName() : null, OWNER_NAME),
                value(shop != null ? shop.mobile() : null, MOBILE),
                list(shop != null ? shop.addressLines() : null, ADDRESS_LINES),
                list(shop != null ? shop.terms() : null, TERMS));
    }

    private static String value(String configured, String fallback) {
        if (configured == null || configured.isBlank()) {
            return fallback;
        }
        return configured.trim();
    }

    private static List<String> list(List<String> configured, List<String> fallback) {
        if (configured == null || configured.isEmpty()) {
            return fallback;
        }
        return configured;
    }

    public record Resolved(
            String name,
            String ownerName,
            String mobile,
            List<String> addressLines,
            List<String> terms) {}
}
