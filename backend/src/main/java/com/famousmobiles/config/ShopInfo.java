package com.famousmobiles.config;

import java.util.ArrayList;
import java.util.List;

import com.famousmobiles.domain.Store;

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
            "Delivery should be collected within 21 days; otherwise we are not responsible.",
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

    public static Resolved resolve(Store store, AppProperties.Shop fallbackShop) {
        if (store != null) {
            String name = value(store.getName(), NAME);
            String ownerName = value(store.getOwnerName(), OWNER_NAME);
            String mobile = value(store.getMobile(), MOBILE);
            List<String> addressLines = new ArrayList<>();
            if (store.getAddressLine1() != null && !store.getAddressLine1().isBlank()) {
                addressLines.add(store.getAddressLine1().trim());
            }
            if (store.getAddressLine2() != null && !store.getAddressLine2().isBlank()) {
                addressLines.add(store.getAddressLine2().trim());
            }
            if (store.getCity() != null && !store.getCity().isBlank()) {
                addressLines.add(store.getCity().trim());
            }
            if (addressLines.isEmpty()) {
                addressLines = ADDRESS_LINES;
            }
            List<String> terms = (store.getTerms() != null && !store.getTerms().isEmpty())
                    ? store.getTerms()
                    : TERMS;
            return new Resolved(name, ownerName, mobile, addressLines, terms);
        }
        return resolve(fallbackShop);
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
