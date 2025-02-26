import cloneDeep from "clone-deep";
import { Field } from "formik";

import {
  extractRevisionNumber,
  generateStatusElement,
  generateRelationIconImage,
  extractRelationEndpoints,
  generateIconImg,
  generateEntityIdentifier,
} from "app/utils/utils";

export function generateLocalApplicationRows(
  applications,
  applicationStatuses,
  tableRowClick,
  query
) {
  if (!applications) {
    return [];
  }

  function getStore(charmURL) {
    if (charmURL) {
      return charmURL.indexOf("local:") === 0 ? "Local" : "Charmhub";
    }
    return "";
  }

  return Object.keys(applications).map((key) => {
    const app = applications[key];
    const rev = extractRevisionNumber(app["charm-url"]) || "-";
    const store = getStore(app["charm-url"]);
    const version = app["workload-version"] || "-";

    return {
      columns: [
        {
          "data-test-column": "name",
          content: generateEntityIdentifier(app["charm-url"] || "", key, false),
          className: "u-truncate",
        },
        {
          "data-test-column": "status",
          content: app.status
            ? generateStatusElement(applicationStatuses[app.name])
            : "-",
          className: "u-capitalise u-truncate",
        },
        {
          "data-test-column": "version",
          content: app["workload-version"] || "-",
        },
        {
          "data-test-column": "scale",
          content: app["unit-count"],
          className: "u-align--right",
        },
        {
          "data-test-column": "store",
          content: store,
        },
        {
          "data-test-column": "revision",
          content: rev,
          className: "u-align--right",
        },
        {
          "data-test-column": "message",
          content: app.status?.message,
          className: "u-truncate",
          title: app.status?.message,
        },
      ],
      sortData: {
        app: key,
        status: app.status?.status,
        version,
        scale: app["unit-count"],
        store,
        rev,
        notes: "-",
      },
      onClick: (e) => tableRowClick("app", key, e),
      "data-app": key,
      className:
        query?.panel === "apps" && query?.entity === key ? "is-selected" : "",
    };
  });
}

export function generateRemoteApplicationRows(
  modelStatusData,
  tableRowClick,
  query
) {
  if (!modelStatusData) {
    return [];
  }
  const applications = cloneDeep(modelStatusData["remote-applications"]);
  return (
    applications &&
    Object.keys(applications).map((key) => {
      const app = applications[key];
      const status = app.status.status;
      const offerUrl = app["offer-url"];

      const interfaces = Object.keys(app?.["relations"]).map(
        (endpointInterface) => endpointInterface
      );

      return {
        columns: [
          {
            "data-test-column": "app",
            content: app["offer-name"], // we cannot access charm name
            className: "u-truncate",
          },
          {
            "data-test-column": "status",
            content: status,
            className: "u-capitalise u-truncate",
          },
          {
            "data-test-column": "interface",
            content: interfaces.join(","),
          },
          {
            "data-test-column": "offer_url",
            content: offerUrl,
            className: "u-truncate",
          },
          {
            "data-test-column": "store",
            content: "-", // store info not yet available from API
          },
        ],
        sortData: {
          app: key,
          status: "status",
          interface: "interface",
          offer_url: "offer_url",
          store: "store",
        },
        "data-app": key,
        onClick: (e) => false && tableRowClick(key, "remoteApps", e), // DISABLED PANEL
        className:
          query?.panel === "remoteApps" && query?.entity === key
            ? "is-selected"
            : "",
      };
    })
  );
}

export function generateUnitRows(
  units,
  tableRowClick,
  showCheckbox,
  hideMachines
) {
  if (!units) {
    return [];
  }

  function generatePortsList(ports) {
    if (!ports || ports.length === 0) {
      return "-";
    }
    return ports.map((portData) => portData.number).join(", ");
  }

  const clonedUnits = cloneDeep(units);

  // Restructure the unit list data to allow for the proper subordinate
  // rendering with the current table setup.
  Object.entries(clonedUnits).forEach(([unitId, unitData]) => {
    // The unit list may not have the principal in it because this code is
    // used to generate the table for the application unit list as well
    // in which case it'll be the only units in the list.
    if (unitData.subordinate && clonedUnits[unitData.principal]) {
      if (!clonedUnits[unitData.principal].subordinates) {
        clonedUnits[unitData.principal].subordinates = {};
      }
      clonedUnits[unitData.principal].subordinates[unitId] = unitData;
      delete clonedUnits[unitId];
    }
  });

  const unitRows = [];
  Object.keys(clonedUnits).forEach((unitId) => {
    const unit = clonedUnits[unitId];
    const workload = unit["workload-status"].current || "-";
    const agent = unit["agent-status"].current || "-";
    const publicAddress = unit["public-address"] || "-";
    const ports = generatePortsList(unit.ports);
    const message = unit["workload-status"].message || "-";
    const charm = unit["charm-url"];
    let columns = [
      {
        content: generateEntityIdentifier(charm ? charm : "", unitId, false),
        className: "u-truncate",
      },
      {
        content: generateStatusElement(workload),
        className: "u-capitalise",
      },
      { content: agent },
      {
        content: unit["machine-id"],
        className: "u-align--right",
        key: "machine",
      },
      { content: publicAddress },
      {
        content: ports,
        className: "u-align--right",
        title: ports,
      },
      {
        content: <span title={message}>{message}</span>,
        className: "u-truncate",
      },
    ];

    if (hideMachines) {
      columns = columns.filter((column) => !(column.key === "machine"));
    }

    if (showCheckbox) {
      const fieldID = `table-checkbox-${unitId}`;
      const ariaLabeledBy = `aria-labeled-${unitId}`;
      columns.splice(0, 0, {
        content: (
          <label className="p-checkbox--inline" htmlFor={fieldID}>
            <Field
              id={fieldID}
              type="checkbox"
              aria-labelledby={ariaLabeledBy}
              className="p-checkbox__input"
              name="selectedUnits"
              value={unitId}
            />
            <span className="p-checkbox__label" id={ariaLabeledBy}></span>
          </label>
        ),
      });
    }

    unitRows.push({
      columns,
      sortData: {
        unit: unitId,
        workload,
        agent,
        machine: unit.machine,
        publicAddress,
        ports,
        message,
      },
      onClick: (e) => tableRowClick("unit", unitId, e),
      "data-unit": unitId,
    });

    const subordinates = unit.subordinates;

    if (subordinates) {
      for (let [key] of Object.entries(subordinates)) {
        const subordinate = subordinates[key];
        let columns = [
          {
            content: generateEntityIdentifier(
              subordinate["charm-url"],
              key,
              true
            ),
            className: "u-truncate",
          },
          {
            content: generateStatusElement(
              subordinate["workload-status"].current
            ),
            className: "u-capitalise",
          },
          { content: subordinate["agent-status"].current },
          { content: subordinate["machine-id"], className: "u-align--right" },
          { content: subordinate["public-address"] },
          {
            content: subordinate["public-address"].split(":")[-1] || "-",
            className: "u-align--right",
          },
          {
            content: subordinate["workload-status"].current,
            className: "u-truncate",
          },
        ];

        if (showCheckbox) {
          // Add an extra column if the checkbox is shown on the parent.
          columns.splice(0, 0, {
            content: "",
          });
        }

        unitRows.push({
          columns,
          // This is using the parent data for sorting so that they stick to
          // their parent while being sorted. This isn't fool-proof but it's
          // the best we have for the current design and table implementation.
          sortData: {
            unit: unitId,
            workload,
            agent,
            machine: unit["machine-id"],
            publicAddress,
            ports,
            message,
          },
          onClick: (e) => tableRowClick("unit", unitId, e),
          "data-unit": unitId,
        });
      }
    }
  });

  return unitRows;
}

export function generateMachineRows(
  machines,
  units,
  tableRowClick,
  selectedEntity
) {
  if (!machines) {
    return [];
  }

  const generateMachineApps = (machineId, units) => {
    const appsOnMachine = [];
    units &&
      Object.values(units).forEach((unitInfo) => {
        if (machineId === unitInfo["machine-id"]) {
          appsOnMachine.push([unitInfo.application, unitInfo["charm-url"]]);
        }
      });
    const apps = appsOnMachine.length
      ? appsOnMachine.map((app) => {
          return generateIconImg(app[0], app[1]);
        })
      : "None";
    return apps;
  };

  return Object.keys(machines).map((machineId) => {
    const machine = machines[machineId];
    const az =
      machine?.["hardware-characteristics"]?.["availability-zone"] || "";
    return {
      columns: [
        {
          content: (
            <>
              <div>
                {machineId}
                <span className="u-capitalise">. {machine.series}</span>
              </div>
              {machine.dnsName}
            </>
          ),
        },
        {
          content: generateMachineApps(machineId, units),
          className: "machine-app-icons",
        },
        {
          content: generateStatusElement(machine["agent-status"].current),
          className: "u-capitalise",
        },
        { content: az },
        { content: machine["instance-id"] },
        {
          content: (
            <span title={machine["agent-status"].message}>
              {machine["agent-status"].message}
            </span>
          ),
          className: "u-truncate",
        },
      ],
      sortData: {
        machine: machine.series,
        state: machine?.["agent-status"]?.current,
        az,
        instanceId: machine["instance-id"],
        message: machine?.["agent-status"].message,
      },
      onClick: (e) => tableRowClick("machine", machineId, e),
      "data-machine": machineId,
      className: selectedEntity === machineId ? "is-selected" : "",
    };
  });
}

export function generateRelationRows(relationData, applications) {
  if (!relationData) {
    return [];
  }
  return Object.keys(relationData).map((relationId) => {
    const relation = relationData[relationId];
    const {
      provider,
      requirer,
      peer,
      providerApplicationName,
      requirerApplicationName,
      peerApplicationName,
    } = extractRelationEndpoints(relation);
    const providerLabel = provider || peer || "-";
    const requirerLabel = requirer || "-";
    return {
      columns: [
        {
          content: (
            <>
              {generateRelationIconImage(
                providerApplicationName || peerApplicationName,
                applications
              )}
              {providerLabel}
            </>
          ),
          className: "u-truncate",
        },
        {
          content: (
            <>
              {generateRelationIconImage(requirerApplicationName, applications)}
              {requirerLabel}
            </>
          ),
          title: requirerLabel,
          className: "u-truncate",
        },
        { content: relation.endpoints[0].relation.interface },
        { content: relation.endpoints[0].relation.role },
      ],
      sortData: {
        provider: providerLabel,
        requirer: requirerLabel,
        interface: relation.interface,
        type: relation?.endpoints[0]?.relation.role,
      },
    };
  });
}

export function generateOffersRows(modelStatusData) {
  if (!modelStatusData) {
    return [];
  }

  const offers = modelStatusData.offers;
  return Object.keys(offers).map((offerId) => {
    const offer = offers[offerId];
    return {
      columns: [
        {
          content: (
            <>
              {generateRelationIconImage(
                offer.applicationName,
                modelStatusData
              )}
              {offer.applicationName}
            </>
          ),
          className: "u-truncate",
        },
        {
          content: Object.entries(offer.endpoints)
            .map((endpoint) => `${endpoint[1].name}:${endpoint[1].interface}`)
            .join("/n"),
          className: "u-truncate",
        },
        {
          content: offer.activeConnectedCount,
        },
      ],
    };
  });
}

export function generateAppOffersRows(modelStatusData, tableRowClick, query) {
  if (!modelStatusData) {
    return [];
  }

  const offers = modelStatusData.offers;

  return Object.keys(offers).map((offerId) => {
    const offer = offers[offerId];

    const interfaces = Object.keys(offer?.["endpoints"]).map(
      (endpointInterface) => endpointInterface
    );

    return {
      columns: [
        {
          content: (
            <>
              {generateRelationIconImage(offer, modelStatusData)}
              {offer["offer-name"]}
            </>
          ),
          className: "u-truncate",
        },
        {
          content: <>{interfaces.join(",")}</>,
        },
        {
          content: (
            <>
              {offer["active-connected-count"]} /{" "}
              {offer["total-connected-count"]}
            </>
          ),
        },
        {
          content: "-", // offer url is not yet available from the API
        },
      ],
      onClick: (e) => false && tableRowClick(offerId, "offers", e), // DISABLED PANEL
      "data-app": offerId,
      className:
        query.panel === "offers" && query.entity === offerId
          ? "is-selected"
          : "",
    };
  });
}

export function generateConsumedRows(modelStatusData) {
  if (!modelStatusData) {
    return [];
  }

  const remoteApplications = modelStatusData["remote-applications"] || {};
  return Object.keys(remoteApplications).map((appName) => {
    const application = remoteApplications[appName];
    return {
      columns: [
        {
          content: (
            <>
              {generateRelationIconImage(
                application.offerName,
                modelStatusData
              )}
              {application.offerName}
            </>
          ),
          className: "u-truncate",
        },
        {
          content: Object.entries(application.endpoints)
            .map((endpoint) => `${endpoint[1].name}:${endpoint[1].interface}`)
            .join("/n"),
          className: "u-truncate",
        },
        {
          content: application.status.status,
        },
      ],
    };
  });
}
