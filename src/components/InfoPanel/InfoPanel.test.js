import { render, screen } from "@testing-library/react";
import configureStore from "redux-mock-store";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router";
import { QueryParamProvider } from "use-query-params";
import { ReactRouter5Adapter } from "use-query-params/adapters/react-router-5";

import { reduxStateFactory } from "testing/redux-factory";
import TestRoute from "components/Routes/TestRoute";

import InfoPanel from "./InfoPanel";

const mockStore = configureStore([]);

jest.mock("components/Topology/Topology", () => {
  const Topology = () => <div data-testid="topology"></div>;
  return Topology;
});

describe("Info Panel", () => {
  it("renders the topology", () => {
    const mockState = reduxStateFactory().build();
    const store = mockStore(mockState);
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/models/kirk@external/enterprise"]}>
          <QueryParamProvider adapter={ReactRouter5Adapter}>
            <TestRoute path="/models/:userName/:modelName?">
              <InfoPanel />
            </TestRoute>
          </QueryParamProvider>
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getByTestId("topology")).toBeInTheDocument();
  });

  it("renders the expanded topology on click", () => {
    const mockState = reduxStateFactory().build();
    const store = mockStore(mockState);
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/models/kirk@external/enterprise"]}>
          <QueryParamProvider adapter={ReactRouter5Adapter}>
            <TestRoute path="/models/:userName/:modelName?">
              <InfoPanel />
            </TestRoute>
          </QueryParamProvider>
        </MemoryRouter>
      </Provider>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    screen.getByRole("button").click();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
