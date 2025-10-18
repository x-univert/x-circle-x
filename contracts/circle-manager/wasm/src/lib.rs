// Code généré pour la compilation en WebAssembly
// Ne pas modifier manuellement

#![no_std]

multiversx_sc_wasm_adapter::endpoints! {
    circle_manager
    (
        init
        createCircle
        requestMembership
        voteForMember
        contribute
        getCircle
        getNextCircleId
        getTreasuryBalance
        getProtocolFee
    )
}

multiversx_sc_wasm_adapter::async_callback! { circle_manager }
