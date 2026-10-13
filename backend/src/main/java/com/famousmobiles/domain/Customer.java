package com.famousmobiles.domain;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

@Entity
@Table(name = "customers")
public class Customer extends BaseEntity {

    @Column(name = "customer_code", nullable = false, unique = true)
    private String customerCode;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    /** Denormalized primary mobile for receipts, notifications, and legacy queries. */
    @Column(nullable = false)
    private String mobile;

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("isPrimary DESC, createdAt ASC")
    private List<CustomerPhone> phones = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String address;

    private String area;

    private String city;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public String getCustomerCode() {
        return customerCode;
    }

    public void setCustomerCode(String customerCode) {
        this.customerCode = customerCode;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public List<CustomerPhone> getPhones() {
        return phones;
    }

    public void setPhones(List<CustomerPhone> phones) {
        this.phones = phones;
    }

    public void replacePhones(List<CustomerPhone> newPhones) {
        phones.clear();
        for (CustomerPhone phone : newPhones) {
            phone.setCustomer(this);
            phones.add(phone);
        }
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getArea() {
        return area;
    }

    public void setArea(String area) {
        this.area = area;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
