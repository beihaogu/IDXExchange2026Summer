# Week 1 - MySQL Environment Setup

## Overview

This project sets up a local MySQL 8 instance using Docker and imports the provided RETS database dumps.

## Environment

- Docker Desktop
- MySQL 8
- Database: `rets`
- Container: `idx-mysql-local`

---

## Start MySQL

```bash
docker run \
  --name idx-mysql-local \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=rets \
  -p 3306:3306 \
  -d \
  mysql:8
```

---

## Import SQL Dumps

```bash
docker exec -i idx-mysql-local mysql -uroot -ppassword rets < rets_property.sql

docker exec -i idx-mysql-local mysql -uroot -ppassword rets < rets_openhouse.sql
```

---

## Verification

### Tables

```text
mysql> SHOW TABLES;

+----------------+
| Tables_in_rets |
+----------------+
| rets_openhouse |
| rets_property  |
+----------------+
```

### Row Counts

| Table | Rows |
|-------|-----:|
| rets_property | 41,199 |
| rets_openhouse | 4,282 |

Verified using:

```sql
SELECT COUNT(*) FROM rets_property;
SELECT COUNT(*) FROM rets_openhouse;
```

### Table Schemas

| Table | Columns |
|-------|--------:|
| rets_property | 126 |
| rets_openhouse | 13 |

Example columns from `rets_property`:

- id
- L_ListingID
- L_DisplayId
- L_Address
- L_City
- L_State
- L_SystemPrice
- ModificationTimestamp
- L_Status
- YearBuilt
- LotSizeSquareFeet
- PhotosChangeTimestamp

Example columns from `rets_openhouse`:

- id
- L_ListingID
- L_DisplayId
- OpenHouseDate
- OH_StartTime
- OH_EndTime
- updated_date

Schemas verified using:

```sql
DESCRIBE rets_property;
DESCRIBE rets_openhouse;
```

---

## Useful Commands

Start existing container:

```bash
docker start idx-mysql-local
```

Stop container:

```bash
docker stop idx-mysql-local
```

Open MySQL shell:

```bash
docker exec -it idx-mysql-local mysql -uroot -ppassword rets
```

## Why Docker?

A Docker container provides an isolated and reproducible runtime environment. Using the official MySQL 8 image ensures every developer runs the same database version and configuration without installing MySQL directly on the host operating system.