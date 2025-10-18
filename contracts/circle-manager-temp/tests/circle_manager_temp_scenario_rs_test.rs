use multiversx_sc_scenario::*;

fn world() -> ScenarioWorld {
    let mut blockchain = ScenarioWorld::new();

    // blockchain.set_current_dir_from_workspace("relative path to your workspace, if applicable");
    blockchain.register_contract("mxsc:output/circle-manager-temp.mxsc.json", circle_manager_temp::ContractBuilder);
    blockchain
}

#[test]
fn empty_rs() {
    world().run("scenarios/circle_manager_temp.scen.json");
}
