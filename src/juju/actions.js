import cloneDeep from "clone-deep";

import { fetchAndStoreModelStatus } from "juju";

// Action labels
export const actionsList = {
  clearControllerData: "CLEAR_CONTROLLER_DATA",
  clearModelData: "CLEAR_MODEL_DATA",
  updateControllerList: "UPDATE_CONTROLLER_LIST",
  updateModelInfo: "UPDATE_MODEL_INFO",
  updateModelStatus: "UPDATE_MODEL_STATUS",
  updateModelList: "UPDATE_MODEL_LIST",
  processAllWatcherDeltas: "PROCESS_ALL_WATCHER_DELTAS",
  populateMissingAllWatcherData: "POPULATE_MISSING_ALLWATCHER_DATA",
};

// Action creators

export function clearModelData() {
  return {
    type: actionsList.clearModelData,
  };
}

export function clearControllerData() {
  return {
    type: actionsList.clearControllerData,
  };
}

/**
  @param {String} wsControllerURL The URL of the websocket connection.
  @param {Array} controllers The list of controllers to store.
*/
export function updateControllerList(wsControllerURL, controllers) {
  return {
    type: actionsList.updateControllerList,
    payload: {
      wsControllerURL,
      controllers,
    },
  };
}

/**
  @param {Array} models The list of models to store.
*/
export function updateModelList(models) {
  return {
    type: actionsList.updateModelList,
    payload: models,
  };
}

/**
  @param {String} modelUUID The modelUUID of the model to store the
    status under.
  @param {Object} status The status data as returned from the API.
 */
export function updateModelStatus(modelUUID, status) {
  return {
    type: actionsList.updateModelStatus,
    payload: {
      modelUUID,
      status,
    },
  };
}

/**
  @param {Object} modelInfo The model info data as returned from the API.
 */
export function updateModelInfo(modelInfo) {
  return {
    type: actionsList.updateModelInfo,
    payload: modelInfo,
  };
}

/**
  @param {Array} deltas An array of deltas from the AllWatcher.
*/
export function processAllWatcherDeltas(deltas) {
  return {
    type: actionsList.processAllWatcherDeltas,
    payload: deltas,
  };
}

/**
  @param {Object} status The status data from an `fullStatus` API call.
*/
export function populateMissingAllWatcherData(uuid, status) {
  return {
    type: actionsList.populateMissingAllWatcherData,
    payload: { status, uuid },
  };
}

// Thunks

/**
  Returns the model status that's stored in the database if it exists or makes
  another call to request it if it doesn't.
  @param {String} modelUUID The UUID of the model to request the status of.
 */
export function fetchModelStatus(modelUUID) {
  return async function fetchModelStatus(dispatch, getState) {
    const jujuState = getState().juju;
    if (jujuState.modelStatuses && jujuState.modelStatuses[modelUUID]) {
      // It already exists, don't do anything as it'll be updated shortly
      // by the polling loop.
      return;
    }
    fetchAndStoreModelStatus(modelUUID, dispatch, getState);
  };
}

/**
  Updates the correct controller entry with a cloud and region fetched from
  the supplied model info call.
  @param {String} modelInfo The response from a modelInfo call.
*/
export function addControllerCloudRegion(wsControllerURL, modelInfo) {
  return async function addControllerCloudRegion(dispatch, getState) {
    const controllers = getState()?.juju?.controllers[wsControllerURL];
    const model = modelInfo.results[0].result;
    if (controllers) {
      const updatedControllers = cloneDeep(controllers).map((controller) => {
        if (controller.uuid === model["controller-uuid"]) {
          controller.location = {
            cloud: model["cloud-region"],
            region: model["cloud-tag"].replace("cloud-", ""),
          };
        }
        return controller;
      });
      dispatch(updateControllerList(wsControllerURL, updatedControllers), {
        wsControllerURL,
      });
    } else {
      console.log(
        "attempting to update non-existent controller:",
        wsControllerURL
      );
    }
  };
}
